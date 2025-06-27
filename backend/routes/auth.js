const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// 公开路由（不需要登录）
router.post('/register', authController.register);
router.post('/login', authController.login);

// 需要登录的路由
router.get('/me', authenticate, authController.getMe);

module.exports = router;