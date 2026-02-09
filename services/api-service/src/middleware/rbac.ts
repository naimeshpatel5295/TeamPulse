import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UserRole, ROLE_HIERARCHY } from '@teampulse/shared';
import { db } from '../db';

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const teamId = req.params.teamId || req.body.teamId;

      if (!userId) {
        return next(new ForbiddenError('User not authenticated'));
      }

      if (!teamId) {
        return next(new ForbiddenError('Team context required'));
      }

      const membership = await db('team_members')
        .where({ user_id: userId, team_id: teamId })
        .first();

      if (!membership) {
        return next(new ForbiddenError('Not a member of this team'));
      }

      const userRoleLevel = ROLE_HIERARCHY[membership.role] || 0;
      const hasPermission = allowedRoles.some(
        (role) => userRoleLevel >= ROLE_HIERARCHY[role]
      );

      if (!hasPermission) {
        return next(new ForbiddenError('Insufficient permissions'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireTeamMember() {
  return requireRole(UserRole.VIEWER, UserRole.MEMBER, UserRole.ADMIN, UserRole.OWNER);
}

export function requireTeamAdmin() {
  return requireRole(UserRole.ADMIN, UserRole.OWNER);
}

export function requireTeamOwner() {
  return requireRole(UserRole.OWNER);
}
