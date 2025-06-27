const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT密钥（实际项目中应该放在环境变量中）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// 生成JWT令牌
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// 用户注册
exports.register = async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    
    // 验证必填字段
    if (!email || !name || !password) {
      return res.status(400).json({
        status: 'error',
        message: '请填写所有必填字段'
      });
    }
    
    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: '该邮箱已被注册'
      });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建新用户
    const user = await User.create({
      email,
      name,
      password: hashedPassword,
      role: role || 'student'
    });
    
    // 生成令牌
    const token = generateToken(user._id);
    
    // 返回用户信息（不包含密码）
    res.status(201).json({
      status: 'success',
      message: '注册成功',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      }
    });
    
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      status: 'error',
      message: '注册失败，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 验证必填字段
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: '请输入邮箱和密码'
      });
    }
    
    // 查找用户（包含密码字段）
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: '邮箱或密码错误'
      });
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: '邮箱或密码错误'
      });
    }
    
    // 检查账号是否激活
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: '账号已被禁用'
      });
    }
    
    // 生成令牌
    const token = generateToken(user._id);
    
    // 返回用户信息（不包含密码）
    res.json({
      status: 'success',
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      }
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '登录失败，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 获取当前用户信息
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }
    
    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取用户信息失败'
    });
  }
};