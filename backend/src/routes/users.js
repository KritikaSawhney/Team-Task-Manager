const express = require('express');
const router = express.Router();
const { getUsers, searchUsers, getUser, updateUserRole } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

router.use(authenticate);

router.get('/search', searchUsers);          // Any authenticated user
router.get('/', requireAdmin, getUsers);     // Admin only
router.get('/:id', getUser);                 // Any authenticated user
router.put('/:id/role', requireAdmin, updateUserRole); // Admin only

module.exports = router;
