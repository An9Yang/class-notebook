const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qaController');
const { authenticate } = require('../middleware/auth');

// 测试路由不需要认证
router.get('/test', async (req, res) => {
  try {
    const { azureOpenAI } = require('../services/azureOpenAI');
    
    if (!azureOpenAI.validateConfig()) {
      return res.status(500).json({ error: 'Azure OpenAI未配置' });
    }
    
    const response = await azureOpenAI.createChatCompletion([
      { role: 'system', content: '你是一个助手' },
      { role: 'user', content: '请说"测试成功"' }
    ], { max_tokens: 100 });
    
    res.json({ 
      success: true, 
      message: response.choices[0].message.content,
      config: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT
      }
    });
  } catch (error) {
    console.error('测试错误:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// 所有其他路由都需要登录
router.use(authenticate);

// 问答相关路由
router.post('/ask/:classId', qaController.askQuestion); // 提问
router.get('/summary/:classId', qaController.generateSummary); // 生成总结
router.get('/quiz/:classId', qaController.generateQuizQuestions); // 生成复习问题
router.post('/generate-outline', qaController.generateOutline); // 生成大纲

module.exports = router;