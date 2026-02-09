import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { HabitFrequency } from '@teampulse/shared';
import { authenticate } from '../../middleware/auth';
import { requireTeamMember } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { parsePaginationQuery } from '../../utils/pagination';
import * as habitsService from './habits.service';

const router = Router();

const createHabitSchema = z.object({
  name: z.string().min(1).max(255),
  teamId: z.string().uuid(),
  description: z.string().max(1000).optional(),
  frequency: z.nativeEnum(HabitFrequency).optional(),
  targetCount: z.number().int().min(1).max(100).optional(),
});

const updateHabitSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  frequency: z.nativeEnum(HabitFrequency).optional(),
  targetCount: z.number().int().min(1).max(100).optional(),
});

const logCompletionSchema = z.object({
  note: z.string().max(500).optional(),
});

// Create a habit
router.post(
  '/',
  authenticate,
  validate(createHabitSchema),
  requireTeamMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const habit = await habitsService.createHabit({
        ...req.body,
        createdBy: req.user!.userId,
      });
      res.status(201).json({ success: true, data: habit });
    } catch (err) {
      next(err);
    }
  }
);

// Get habits by team
router.get(
  '/team/:teamId',
  authenticate,
  requireTeamMember(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationQuery(req);
      const result = await habitsService.getHabitsByTeam(req.params.teamId, pagination);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// Get habit by ID
router.get(
  '/:habitId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const habit = await habitsService.getHabitById(req.params.habitId);
      res.json({ success: true, data: habit });
    } catch (err) {
      next(err);
    }
  }
);

// Update habit
router.patch(
  '/:habitId',
  authenticate,
  validate(updateHabitSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const habit = await habitsService.updateHabit(req.params.habitId, req.body);
      res.json({ success: true, data: habit });
    } catch (err) {
      next(err);
    }
  }
);

// Delete habit
router.delete(
  '/:habitId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await habitsService.deleteHabit(req.params.habitId);
      res.json({ success: true, data: { message: 'Habit deleted' } });
    } catch (err) {
      next(err);
    }
  }
);

// Log habit completion
router.post(
  '/:habitId/log',
  authenticate,
  validate(logCompletionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await habitsService.logHabitCompletion(
        req.params.habitId,
        req.user!.userId,
        req.body.note
      );
      res.status(201).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }
);

// Get habit logs
router.get(
  '/:habitId/logs',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationQuery(req);
      const result = await habitsService.getHabitLogs(req.params.habitId, pagination);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// Get my progress today
router.get(
  '/:habitId/my-progress',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await habitsService.getUserHabitLogsToday(
        req.user!.userId,
        req.params.habitId
      );
      const habit = await habitsService.getHabitById(req.params.habitId);
      res.json({
        success: true,
        data: {
          habit,
          completedToday: logs.length,
          target: habit.targetCount,
          isComplete: logs.length >= habit.targetCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as habitsRoutes };
