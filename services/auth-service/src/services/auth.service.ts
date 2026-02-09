import bcrypt from 'bcryptjs';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  IUser,
  ITokenPair,
} from '@teampulse/shared';
import { config } from '../config';
import { db } from '../db';
import { redis } from '../redis';
import { generateTokenPair, rotateRefreshToken, revokeAllUserTokens } from './token.service';

interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

function toUserResponse(row: DbUser): IUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<{ user: IUser; tokens: ITokenPair }> {
  const existing = await db('users').where({ email }).first();
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  const [row] = await db('users')
    .insert({ email, password_hash: passwordHash, name })
    .returning('*');

  const user = toUserResponse(row);
  const tokens = await generateTokenPair(user.id, user.email);

  return { user, tokens };
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: IUser; tokens: ITokenPair }> {
  // Check blacklist
  const blacklisted = await redis.get(`blacklist:user:email:${email}`);
  if (blacklisted) {
    throw new UnauthorizedError('Account temporarily locked. Please try again later.');
  }

  const row = await db('users').where({ email }).first();
  if (!row) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    // Increment failed login attempts
    const key = `login_attempts:${email}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 900); // 15 min window
    }
    if (attempts >= 5) {
      await redis.set(`blacklist:user:email:${email}`, '1', 'EX', 900);
    }
    throw new UnauthorizedError('Invalid email or password');
  }

  // Clear failed attempts on successful login
  await redis.del(`login_attempts:${email}`);

  const user = toUserResponse(row);
  const tokens = await generateTokenPair(user.id, user.email);

  return { user, tokens };
}

export async function refresh(
  refreshToken: string,
): Promise<{ user: IUser; tokens: ITokenPair }> {
  // Decode the compound token to get the familyId, then look up the user
  const [, familyId] = refreshToken.split(':');
  if (!familyId) throw new UnauthorizedError('Invalid refresh token');

  const tokenRow = await db('refresh_tokens')
    .where({ family_id: familyId, revoked: false })
    .orderBy('created_at', 'desc')
    .first();

  if (!tokenRow) throw new UnauthorizedError('Invalid refresh token');

  // Check blacklist
  const blacklisted = await redis.get(`blacklist:user:${tokenRow.user_id}`);
  if (blacklisted) {
    throw new UnauthorizedError('Session revoked. Please log in again.');
  }

  const userRow = await db('users').where({ id: tokenRow.user_id }).first();
  if (!userRow) throw new NotFoundError('User');

  const tokens = await rotateRefreshToken(refreshToken, userRow.id, userRow.email);
  const user = toUserResponse(userRow);

  return { user, tokens };
}

export async function logout(userId: string): Promise<void> {
  await revokeAllUserTokens(userId);
}

export async function getProfile(userId: string): Promise<IUser> {
  const row = await db('users').where({ id: userId }).first();
  if (!row) throw new NotFoundError('User');
  return toUserResponse(row);
}
