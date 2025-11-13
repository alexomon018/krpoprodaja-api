import { Router } from 'express'
import {
  createHabit,
  getUserHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  logHabitCompletion,
  completeHabit,
  getHabitsByTag,
  addTagsToHabit,
  removeTagFromHabit,
} from '../controllers/habitController.ts'
import { authenticateToken } from '../middleware/auth.ts'
import { validateBody, validateParams } from '../middleware/validation.ts'
import { z } from 'zod'

const router = Router()

// Apply authentication to all routes
router.use(authenticateToken)

// Validation schemas
const createHabitSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({
      message: 'Frequency must be daily, weekly, or monthly',
    }),
  }),
  targetCount: z.number().int().positive().optional().default(1),
  tagIds: z.array(z.string().uuid()).optional(),
})

const updateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  targetCount: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

const uuidSchema = z.object({
  id: z.string().uuid('Invalid habit ID format'),
})

const habitIdSchema = z.object({
  habitId: z.string().uuid('Invalid habit ID format'),
})

const logCompletionSchema = z.object({
  note: z.string().optional(),
})

const tagIdSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID format'),
})

const habitTagSchema = z.object({
  id: z.string().uuid('Invalid habit ID format'),
  tagId: z.string().uuid('Invalid tag ID format'),
})

const addTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()).min(1, 'At least one tag ID is required'),
})

// Routes
router.get('/', getUserHabits)
router.get('/:id', validateParams(uuidSchema), getHabitById)
router.post('/', validateBody(createHabitSchema), createHabit)
router.put(
  '/:id',
  validateParams(uuidSchema),
  validateBody(updateHabitSchema),
  updateHabit
)
router.delete('/:id', validateParams(uuidSchema), deleteHabit)
router.post(
  '/:habitId/log',
  validateParams(habitIdSchema),
  validateBody(logCompletionSchema),
  logHabitCompletion
)

// Completion endpoint
router.post(
  '/:id/complete',
  validateParams(uuidSchema),
  validateBody(logCompletionSchema),
  completeHabit
)

// Tag-related endpoints
router.get('/tag/:tagId', validateParams(tagIdSchema), getHabitsByTag)
router.post(
  '/:id/tags',
  validateParams(uuidSchema),
  validateBody(addTagsSchema),
  addTagsToHabit
)
router.delete(
  '/:id/tags/:tagId',
  validateParams(habitTagSchema),
  removeTagFromHabit
)

export default router
