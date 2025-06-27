const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（用于访问上传的文件）
app.use('/uploads', express.static('uploads'));

// 路由
const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/class');
const uploadRoutes = require('./routes/upload');
const processRoutes = require('./routes/process');
const qaRoutes = require('./routes/qa');

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/process', processRoutes);
app.use('/api/qa', qaRoutes);

// 健康检查端点 - 用于测试服务器是否正常运行
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 测试数据库连接端点
app.get('/api/health/db', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      status: dbState === 1 ? 'ok' : 'error',
      database: states[dbState],
      message: dbState === 1 ? '数据库连接正常' : '数据库未连接'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '数据库检查失败',
      error: error.message
    });
  }
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用课堂笔记系统API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      healthDb: '/api/health/db',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      classes: {
        create: 'POST /api/classes',
        list: 'GET /api/classes',
        get: 'GET /api/classes/:id',
        update: 'PUT /api/classes/:id',
        delete: 'DELETE /api/classes/:id'
      },
      upload: {
        recording: 'POST /api/upload/recording',
        image: 'POST /api/upload/image'
      }
    }
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: '未找到请求的资源'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 如果有MongoDB连接字符串，尝试连接数据库
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ 数据库连接成功');
    } else {
      console.log('⚠️  未配置数据库连接，跳过数据库连接');
    }
    
    // 验证Azure服务配置
    const { validateSpeechConfig } = require('./services/azureSpeech');
    const { validateOCRConfig } = require('./services/azureOCR');
    const { checkFFmpeg } = require('./utils/checkFFmpeg');
    
    validateSpeechConfig();
    validateOCRConfig();
    
    // 检查FFmpeg是否可用
    const ffmpegAvailable = await checkFFmpeg();
    if (!ffmpegAvailable) {
      console.warn('⚠️  FFmpeg未安装，音频转换功能将不可用');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📋 健康检查: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await mongoose.connection.close();
  process.exit(0);
});

// 启动服务器
startServer();