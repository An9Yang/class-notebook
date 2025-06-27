const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticate } = require('../middleware/auth');

// 所有路由都需要登录
router.use(authenticate);

// 课堂相关路由
router.get('/search', classController.searchClasses); // 搜索课堂（必须在/:id之前）
router.post('/', classController.createClass); // 创建课堂
router.get('/', classController.getMyClasses); // 获取我的课堂列表
router.get('/:id', classController.getClassById); // 获取课堂详情
router.put('/:id', classController.updateClass); // 更新课堂
router.delete('/:id', classController.deleteClass); // 删除课堂

// 删除录音和图片
router.delete('/:classId/recording/:recordingId', classController.deleteRecording); // 删除录音
router.delete('/:classId/image/:imageId', classController.deleteImage); // 删除图片

module.exports = router;