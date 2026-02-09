import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@teampulse/shared';
import { authenticate } from '../../middleware/auth';
import { requireTeamAdmin, requireTeamMember } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import * as teamsService from './teams.service';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(UserRole).optional(),
});

const updateRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

// Create a team
router.post(
  '/',
  authenticate,
  validate(createTeamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await teamsService.createTeam(
        req.body.name,
        req.user!.userId,
        req.body.description
      );
      res.status(201).json({ success: true, data: team });
    } catch (err) {
      next(err);
    }
  }
);

// Get user's teams
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teams = await teamsService.getTeamsByUser(req.user!.userId);
      res.json({ success: true, data: teams });
    } catch (err) {
      next(err);
    }
  }
);

// Get team by ID
router.get(
  '/:teamId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await teamsService.getTeamById(req.params.teamId);
      res.json({ success: true, data: team });
    } catch (err) {
      next(err);
    }
  }
);

// Update team
router.patch(
  '/:teamId',
  authenticate,
  requireTeamAdmin(),
  validate(updateTeamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const team = await teamsService.updateTeam(req.params.teamId, req.body);
      res.json({ success: true, data: team });
    } catch (err) {
      next(err);
    }
  }
);

// Delete team
router.delete(
  '/:teamId',
  authenticate,
  requireTeamAdmin(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await teamsService.deleteTeam(req.params.teamId);
      res.json({ success: true, data: { message: 'Team deleted' } });
    } catch (err) {
      next(err);
    }
  }
);

// Get team members
router.get(
  '/:teamId/members',
  authenticate,
  requireTeamMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await teamsService.getTeamMembers(req.params.teamId);
      res.json({ success: true, data: members });
    } catch (err) {
      next(err);
    }
  }
);

// Add team member
router.post(
  '/:teamId/members',
  authenticate,
  requireTeamAdmin(),
  validate(addMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await teamsService.addTeamMember(
        req.params.teamId,
        req.body.userId,
        req.body.role
      );
      res.status(201).json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  }
);

// Update member role
router.patch(
  '/:teamId/members/:userId',
  authenticate,
  requireTeamAdmin(),
  validate(updateRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await teamsService.updateMemberRole(
        req.params.teamId,
        req.params.userId,
        req.body.role
      );
      res.json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  }
);

// Remove team member
router.delete(
  '/:teamId/members/:userId',
  authenticate,
  requireTeamAdmin(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await teamsService.removeTeamMember(req.params.teamId, req.params.userId);
      res.json({ success: true, data: { message: 'Member removed' } });
    } catch (err) {
      next(err);
    }
  }
);

export { router as teamsRoutes };
