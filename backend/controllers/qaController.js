const Class = require('../models/Class');
const { azureOpenAI } = require('../services/azureOpenAI');

// 准备课堂内容上下文
const prepareClassContext = (classData) => {
  const parts = [];
  
  // 添加基本信息
  parts.push(`课堂标题：${classData.title}`);
  if (classData.courseName) parts.push(`课程：${classData.courseName}`);
  if (classData.teacherName) parts.push(`教师：${classData.teacherName}`);
  if (classData.description) parts.push(`描述：${classData.description}`);
  
  // 添加笔记内容
  if (classData.notes) {
    parts.push('\n=== 笔记内容 ===');
    parts.push(classData.notes);
  }
  
  // 添加录音转写内容
  const transcripts = classData.recordings
    .filter(r => r.transcript)
    .map((r, index) => `录音${index + 1}：${r.transcript}`);
  
  if (transcripts.length > 0) {
    parts.push('\n=== 录音转写内容 ===');
    parts.push(...transcripts);
  }
  
  // 添加OCR内容
  const ocrTexts = classData.images
    .filter(i => i.ocrText)
    .map((i, index) => `图片${index + 1}：${i.ocrText}`);
  
  if (ocrTexts.length > 0) {
    parts.push('\n=== 图片OCR内容 ===');
    parts.push(...ocrTexts);
  }
  
  return parts.join('\n');
};

// 问答接口
exports.askQuestion = async (req, res) => {
  try {
    const { classId } = req.params;
    const { question } = req.body;
    const userId = req.user.userId;
    
    if (!question) {
      return res.status(400).json({
        status: 'error',
        message: '请提供问题'
      });
    }
    
    // 检查AI服务配置
    if (!azureOpenAI.validateConfig()) {
      return res.status(503).json({
        status: 'error',
        message: 'AI服务未配置，请联系管理员'
      });
    }
    
    // 获取课堂数据
    const classData = await Class.findOne({
      _id: classId,
      userId
    });
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    // 准备上下文
    const context = prepareClassContext(classData);
    
    if (!context || context.length < 50) {
      return res.status(400).json({
        status: 'error',
        message: '课堂内容不足，请先添加笔记、录音或图片'
      });
    }
    
    console.log('问答请求 - 课堂:', classData.title, '问题:', question);
    
    // 调用AI服务
    const answer = await azureOpenAI.answerQuestion(question, context);
    
    // 保存问答历史（可选，后续可以实现）
    // await saveQAHistory(classId, userId, question, answer);
    
    res.json({
      status: 'success',
      data: {
        question,
        answer,
        classId,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('问答处理错误:', error);
    res.status(500).json({
      status: 'error',
      message: '问答处理失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 生成课堂总结
exports.generateSummary = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.userId;
    
    // 检查AI服务配置
    if (!azureOpenAI.validateConfig()) {
      return res.status(503).json({
        status: 'error',
        message: 'AI服务未配置，请联系管理员'
      });
    }
    
    // 获取课堂数据
    const classData = await Class.findOne({
      _id: classId,
      userId
    });
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    // 准备内容
    const context = prepareClassContext(classData);
    
    if (!context || context.length < 50) {
      return res.status(400).json({
        status: 'error',
        message: '课堂内容不足，无法生成总结'
      });
    }
    
    console.log('生成总结 - 课堂:', classData.title);
    
    // 调用AI服务
    const summary = await azureOpenAI.generateSummary(context);
    
    res.json({
      status: 'success',
      data: {
        summary,
        classId,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('生成总结错误:', error);
    res.status(500).json({
      status: 'error',
      message: '生成总结失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 生成复习问题
exports.generateQuizQuestions = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.userId;
    
    // 检查AI服务配置
    if (!azureOpenAI.validateConfig()) {
      return res.status(503).json({
        status: 'error',
        message: 'AI服务未配置，请联系管理员'
      });
    }
    
    // 获取课堂数据
    const classData = await Class.findOne({
      _id: classId,
      userId
    });
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    // 准备内容
    const context = prepareClassContext(classData);
    
    if (!context || context.length < 100) {
      return res.status(400).json({
        status: 'error',
        message: '课堂内容不足，无法生成复习问题'
      });
    }
    
    console.log('生成复习问题 - 课堂:', classData.title);
    
    // 调用AI服务
    const questions = await azureOpenAI.generateQuizQuestions(context);
    
    res.json({
      status: 'success',
      data: {
        questions,
        classId,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('生成复习问题错误:', error);
    res.status(500).json({
      status: 'error',
      message: '生成复习问题失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};