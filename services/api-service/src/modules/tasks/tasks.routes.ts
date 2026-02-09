import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@teampulse/shared';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { parsePaginationQuery } from '../../utils/pagination';
import * as tasksService from './tasks.service';

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  projectId: z.string().uuid(),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

// Create a task
router.post(
  '/',
  authenticate,
  validate(createTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = await tasksService.createTask(req.body);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }
);

// Get tasks by project
router.get(
  '/project/:projectId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationQuery(req);
      const result = await tasksService.getTasksByProject(req.params.projectId, pagination);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// Get my tasks
router.get(
  '/my',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = parsePaginationQuery(req);
      const result = await tasksService.getTasksByAssignee(req.user!.userId, pagination);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// Get task by ID
router.get(
  '/:taskId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = await tasksService.getTaskById(req.params.taskId);
      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }
);

// Update task
router.patch(
  '/:taskId',
  authenticate,
  validate(updateTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = await tasksService.updateTask(req.params.taskId, req.body);
      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }
);

// Delete task
router.delete(
  '/:taskId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await tasksService.deleteTask(req.params.taskId);
      res.json({ success: true, data: { message: 'Task deleted' } });
    } catch (err) {
      next(err);
    }
  }
);

export { router as tasksRoutes };
