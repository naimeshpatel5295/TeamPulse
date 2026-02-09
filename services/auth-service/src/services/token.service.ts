import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { IAuthPayload, ITokenPair, UnauthorizedError } from '@teampulse/shared';
import { config } from '../config';
import { db } from '../db';
import { redis } from '../redis';
import { logger } from '../logger';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateAccessToken(payload: IAuthPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): IAuthPayload {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as IAuthPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export async function generateTokenPair(userId: string, email: string): Promise<ITokenPair> {
  const payload: IAuthPayload = { userId, email };
  const accessToken = generateAccessToken(payload);

  const refreshToken = uuidv4();
  const familyId = uuidv4();
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiryMs);

  await db('refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    family_id: familyId,
    expires_at: expiresAt,
  });

  return { accessToken, refreshToken: `${refreshToken}:${familyId}` };
}

export async function rotateRefreshToken(
  compoundToken: string,
  userId: string,
  email: string,
): Promise<ITokenPair> {
  const [rawToken, familyId] = compoundToken.split(':');
  if (!rawToken || !familyId) {
    throw new UnauthorizedError('Invalid refresh token format');
  }

  const tokenHash = hashToken(rawToken);

  const existing = await db('refresh_tokens')
    .where({ token_hash: tokenHash, family_id: familyId, revoked: false })
    .first();

  if (!existing) {
    // Possible token reuse — revoke entire family
    logger.warn({ familyId }, 'Refresh token reuse detected, revoking family');
    await db('refresh_tokens').where({ family_id: familyId }).update({ revoked: true });
    // Blacklist user sessions in Redis for 15 min
    await redis.set(`blacklist:user:${userId}`, '1', 'EX', 900);
    throw new UnauthorizedError('Token reuse detected. Please log in again.');
  }

  if (new Date(existing.expires_at) < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // Revoke old token
  await db('refresh_tokens').where({ id: existing.id }).update({ revoked: true });

  // Issue new pair in the same family
  const newRefreshToken = uuidv4();
  const newTokenHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiryMs);

  await db('refresh_tokens').insert({
    user_id: userId,
    token_hash: newTokenHash,
    family_id: familyId,
    expires_at: expiresAt,
  });

  const accessToken = generateAccessToken({ userId, email });

  return { accessToken, refreshToken: `${newRefreshToken}:${familyId}` };
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db('refresh_tokens').where({ user_id: userId }).update({ revoked: true });
}
