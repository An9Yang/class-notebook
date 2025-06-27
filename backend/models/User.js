const mongoose = require('mongoose');

// 用户数据模型
const userSchema = new mongoose.Schema({
  // 邮箱（用作登录账号）
  email: {
    type: String,
    required: [true, '邮箱是必填项'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  
  // 用户名（显示名称）
  name: {
    type: String,
    required: [true, '用户名是必填项'],
    trim: true,
    minlength: [2, '用户名至少需要2个字符'],
    maxlength: [50, '用户名不能超过50个字符']
  },
  
  // 密码（加密存储）
  password: {
    type: String,
    required: [true, '密码是必填项'],
    minlength: [6, '密码至少需要6个字符'],
    select: false // 查询时默认不返回密码
  },
  
  // 用户角色
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student'
  },
  
  // 账号状态
  isActive: {
    type: Boolean,
    default: true
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
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 创建模型
const User = mongoose.model('User', userSchema);

module.exports = User;