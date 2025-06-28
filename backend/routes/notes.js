const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { addQuickNote, getTimelineEvents } = require('../controllers/notesController');

// 添加随堂笔记
router.post('/:classId/quick-note', authenticate, addQuickNote);

// 获取时间轴事件
router.get('/:classId/timeline', authenticate, getTimelineEvents);

module.exports = router;