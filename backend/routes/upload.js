const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const { uploadAudio, uploadImage } = require('../middleware/upload');

// 所有路由都需要登录
router.use(authenticate);

// 上传录音
router.post('/recording', uploadAudio.single('audio'), uploadController.uploadRecording);

// 上传图片
router.post('/image', uploadImage.single('image'), uploadController.uploadImage);

module.exports = router;