import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProjectStatus } from '@teampulse/shared';
import { authenticate } from '../../middleware/auth';
import { requireTeamMember, requireTeamAdmin } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { parsePaginationQuery } from '../../utils/pagination';
import * as projectsService from './projects.service';

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  teamId: z.string().uuid(),
  description: z.string().max(2000).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

// Create a project
router.post(
  '/',
  authenticate,
  validate(createProjectSchema),
  requireTeamMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectsService.createProject(
        req.body.name,
        req.body.teamId,
        req.body.description
      );
      res.status(201).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }
);

// Get projects by team
router.get(
  '/team/:teamId',
  authenticate,
  requireTeamMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationQuery(req);
      const result = await projectsService.getProjectsByTeam(req.params.teamId, pagination);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// Get project by ID
router.get(
  '/:projectId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectsService.getProjectById(req.params.projectId);
      res.json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }
);

// Update project
router.patch(
  '/:projectId',
  authenticate,
  validate(updateProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await projectsService.updateProject(req.params.projectId, req.body);
      res.json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }
);

// Delete project
router.delete(
  '/:projectId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await projectsService.deleteProject(req.params.projectId);
      res.json({ success: true, data: { message: 'Project deleted' } });
    } catch (err) {
      next(err);
    }
  }
);

export { router as projectsRoutes };
