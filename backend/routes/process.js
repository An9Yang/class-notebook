const express = require('express');
const router = express.Router();
const processController = require('../controllers/processController');
const { authenticate } = require('../middleware/auth');

// 所有路由都需要登录
router.use(authenticate);

// 处理录音转写
router.post('/transcribe/:classId/:recordingId', processController.transcribeRecording);

// 处理图片OCR
router.post('/ocr/:classId/:imageId', processController.processImageOCR);

// 批量处理课堂内容
router.post('/class/:classId', processController.processClassContent);

module.exports = router;