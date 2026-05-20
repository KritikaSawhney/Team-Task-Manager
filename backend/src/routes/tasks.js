const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getTasks, createTask, getTask,
  updateTask, updateTaskStatus, deleteTask, getDashboardStats,
} = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const taskValidation = [
  body('title').trim().notEmpty().withMessage('Task title is required.').isLength({ max: 300 }),
  body('status').optional().isIn(['todo', 'in_progress', 'done']).withMessage('Invalid status.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority.'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format.'),
  body('project_id').notEmpty().withMessage('project_id is required.').isUUID(),
  body('assignee_id').optional({ nullable: true }).isUUID(),
];

const updateValidation = [
  body('title').optional().trim().isLength({ max: 300 }),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional({ nullable: true }).isISO8601(),
  body('assignee_id').optional({ nullable: true }).isUUID(),
];

router.get('/dashboard', getDashboardStats);
router.get('/', getTasks);
router.post('/', taskValidation, createTask);
router.get('/:id', getTask);
router.put('/:id', updateValidation, updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

module.exports = router;
