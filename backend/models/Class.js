const mongoose = require('mongoose');

// 课堂数据模型
const classSchema = new mongoose.Schema({
  // 所属用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 课堂标题
  title: {
    type: String,
    required: [true, '课堂标题是必填项'],
    trim: true
  },
  
  // 课堂描述
  description: {
    type: String,
    trim: true
  },
  
  // 课程名称
  courseName: {
    type: String,
    trim: true
  },
  
  // 教师名称
  teacherName: {
    type: String,
    trim: true
  },
  
  // 课堂日期
  date: {
    type: Date,
    default: Date.now
  },
  
  // 录音文件列表
  recordings: [{
    filename: String,
    url: String,
    duration: Number, // 秒
    size: Number, // 字节
    transcript: String, // 转写文本
    transcriptStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 图片列表
  images: [{
    filename: String,
    url: String,
    size: Number,
    ocrText: String, // OCR识别的文字
    ocrTables: [[String]], // OCR识别的表格数据
    ocrStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    timestamp: Number, // 与录音的时间关联（秒）
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 时间轴事件（新增）
  timelineEvents: [{
    eventId: String,
    type: {
      type: String,
      enum: ['image', 'note'],
      required: true
    },
    timestamp: Number, // 录音开始后的秒数
    data: {
      content: String, // 笔记内容
      imageId: String, // 关联的图片ID
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 笔记内容（富文本）
  notes: {
    type: String,
    default: ''
  },
  
  // 课堂状态
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
classSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 创建模型
const Class = mongoose.model('Class', classSchema);

module.exports = Class;