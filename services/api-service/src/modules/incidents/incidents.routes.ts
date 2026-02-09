import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { IncidentSeverity, IncidentStatus } from '@teampulse/shared';
import { authenticate } from '../../middleware/auth';
import { requireTeamMember } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { parsePaginationQuery } from '../../utils/pagination';
import * as incidentsService from './incidents.service';

const router = Router();

const createIncidentSchema = z.object({
  title: z.string().min(1).max(255),
  teamId: z.string().uuid(),
  description: z.string().max(5000).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  assignedTo: z.string().uuid().optional(),
});

const updateIncidentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

// Create an incident
router.post(
  '/',
  authenticate,
  validate(createIncidentSchema),
  requireTeamMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incident = await incidentsService.createIncident({
        ...req.body,
        reportedBy: req.user!.userId,
      });
      res.status(201).json({ success: true, data: incident });
    } catch (err) {
      next(err);
    }
  }
);

// Get incidents by team
router.get(
  '/team/:teamId',
  authenticate,
  requireTeamMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationQuery(req);
      const result = await incidentsService.getIncidentsByTeam(req.params.teamId, pagination);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// Get open incidents by team
router.get(
  '/team/:teamId/open',
  authenticate,
  requireTeamMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incidents = await incidentsService.getOpenIncidentsByTeam(req.params.teamId);
      res.json({ success: true, data: incidents });
    } catch (err) {
      next(err);
    }
  }
);

// Get stale incidents
router.get(
  '/team/:teamId/stale',
  authenticate,
  requireTeamMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hoursStale = parseInt(req.query.hours as string) || 24;
      const incidents = await incidentsService.getStaleIncidents(req.params.teamId, hoursStale);
      res.json({ success: true, data: incidents });
    } catch (err) {
      next(err);
    }
  }
);

// Get incident by ID
router.get(
  '/:incidentId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incident = await incidentsService.getIncidentById(req.params.incidentId);
      res.json({ success: true, data: incident });
    } catch (err) {
      next(err);
    }
  }
);

// Update incident
router.patch(
  '/:incidentId',
  authenticate,
  validate(updateIncidentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incident = await incidentsService.updateIncident(req.params.incidentId, req.body);
      res.json({ success: true, data: incident });
    } catch (err) {
      next(err);
    }
  }
);

// Delete incident
router.delete(
  '/:incidentId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await incidentsService.deleteIncident(req.params.incidentId);
      res.json({ success: true, data: { message: 'Incident deleted' } });
    } catch (err) {
      next(err);
    }
  }
);

export { router as incidentsRoutes };
