const express = require('express');

const userController = require('../controllers/userController');
const { ensureAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', ensureAdmin, userController.listUsers);
router.post('/', ensureAdmin, userController.createUser);
router.post('/change-password', userController.changeOwnPassword);
router.patch('/:id/role', ensureAdmin, userController.updateUserRole);
router.post('/:id/reset-password', ensureAdmin, userController.resetUserPassword);

module.exports = router;
