const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// 验证JWT令牌的中间件
exports.authenticate = async (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: '请先登录'
      });
    }
    
    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: '无效的登录凭证'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: '登录已过期，请重新登录'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: '验证失败'
    });
  }
};