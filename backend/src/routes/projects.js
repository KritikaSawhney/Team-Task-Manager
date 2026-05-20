const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getProjects, createProject, getProject,
  updateProject, deleteProject, addMember, removeMember,
} = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');

// All project routes require authentication
router.use(authenticate);

const projectValidation = [
  body('name').trim().notEmpty().withMessage('Project name is required.').isLength({ max: 200 }),
  body('description').optional().isLength({ max: 1000 }),
  body('color').optional().isHexColor().withMessage('Color must be a valid hex code.'),
];

router.get('/', getProjects);
router.post('/', projectValidation, createProject);
router.get('/:id', getProject);
router.put('/:id', projectValidation, updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
