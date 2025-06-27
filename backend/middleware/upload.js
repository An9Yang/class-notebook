const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 配置录音文件存储
const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/recordings')
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 配置图片文件存储
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/images')
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器
const audioFilter = (req, file, cb) => {
  // 允许的音频格式
  const allowedTypes = /webm|mp3|wav|m4a|ogg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传音频文件'));
  }
};

const imageFilter = (req, file, cb) => {
  // 允许的图片格式
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'));
  }
};

// 创建multer实例
const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB限制
  }
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  }
});

module.exports = {
  uploadAudio,
  uploadImage
};