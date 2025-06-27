const Class = require('../models/Class');
const { transcribeAudio } = require('../services/azureSpeech');
const { transcribeAudioREST } = require('../services/azureSpeechSimple');
const { transcribeAudioEnhanced } = require('../services/azureSpeechEnhanced');
const { extractTextFromImage } = require('../services/azureOCR');
const path = require('path');

// 处理录音转写
exports.transcribeRecording = async (req, res) => {
  try {
    const { classId, recordingId } = req.params;
    
    // 查找课堂
    const classData = await Class.findOne({
      _id: classId,
      userId: req.user.userId
    });
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    // 查找录音
    const recording = classData.recordings.id(recordingId);
    if (!recording) {
      return res.status(404).json({
        status: 'error',
        message: '录音不存在'
      });
    }
    
    // 检查是否已经转写
    if (recording.transcriptStatus === 'completed') {
      return res.json({
        status: 'success',
        message: '录音已经转写过了',
        data: {
          transcript: recording.transcript
        }
      });
    }
    
    // 更新状态为处理中
    recording.transcriptStatus = 'processing';
    await classData.save();
    
    try {
      // 构建文件路径
      const audioPath = path.join(__dirname, '..', 'uploads', 'recordings', recording.filename);
      
      // 调用Azure语音转文字服务（优先使用增强版）
      let transcript;
      try {
        transcript = await transcribeAudioEnhanced(audioPath);
      } catch (enhancedError) {
        console.log('增强版转写失败，尝试基础版本:', enhancedError.message);
        transcript = await transcribeAudioREST(audioPath);
      }
      
      // 更新转写结果
      recording.transcript = transcript;
      recording.transcriptStatus = 'completed';
      await classData.save();
      
      res.json({
        status: 'success',
        message: '语音转写成功',
        data: {
          transcript
        }
      });
      
    } catch (error) {
      // 转写失败
      recording.transcriptStatus = 'failed';
      await classData.save();
      throw error;
    }
    
  } catch (error) {
    console.error('转写录音错误:', error);
    res.status(500).json({
      status: 'error',
      message: '语音转写失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 处理图片OCR
exports.processImageOCR = async (req, res) => {
  try {
    const { classId, imageId } = req.params;
    
    // 查找课堂
    const classData = await Class.findOne({
      _id: classId,
      userId: req.user.userId
    });
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    // 查找图片
    const image = classData.images.id(imageId);
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }
    
    // 检查是否已经识别
    if (image.ocrStatus === 'completed') {
      return res.json({
        status: 'success',
        message: '图片已经识别过了',
        data: {
          ocrText: image.ocrText
        }
      });
    }
    
    // 更新状态为处理中
    image.ocrStatus = 'processing';
    await classData.save();
    
    try {
      // 构建文件路径
      const imagePath = path.join(__dirname, '..', 'uploads', 'images', image.filename);
      
      // 调用Azure OCR服务
      const ocrResult = await extractTextFromImage(imagePath);
      
      // 如果有AI服务，让AI处理OCR结果
      const { azureOpenAI } = require('../services/azureOpenAI');
      let processedResult = ocrResult;
      
      if (azureOpenAI.validateConfig() && ocrResult.text) {
        try {
          console.log('使用AI增强OCR结果...');
          const enhancedResult = await azureOpenAI.enhanceOCRResult(ocrResult.text);
          processedResult = {
            text: enhancedResult.text || ocrResult.text,
            tables: enhancedResult.tables || ocrResult.tables,
            confidence: ocrResult.confidence
          };
        } catch (aiError) {
          console.error('AI增强失败，使用原始OCR结果:', aiError.message);
        }
      }
      
      // 更新OCR结果
      image.ocrText = processedResult.text;
      if (processedResult.tables && processedResult.tables.length > 0) {
        image.ocrTables = processedResult.tables;
      }
      image.ocrStatus = 'completed';
      await classData.save();
      
      res.json({
        status: 'success',
        message: 'OCR识别成功',
        data: {
          text: ocrResult.text,
          tables: ocrResult.tables,
          confidence: ocrResult.confidence
        }
      });
      
    } catch (error) {
      // OCR失败
      image.ocrStatus = 'failed';
      await classData.save();
      throw error;
    }
    
  } catch (error) {
    console.error('OCR处理错误:', error);
    res.status(500).json({
      status: 'error',
      message: 'OCR识别失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 批量处理课堂的所有待处理项
exports.processClassContent = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // 查找课堂
    const classData = await Class.findOne({
      _id: classId,
      userId: req.user.userId
    });
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    const results = {
      recordings: {
        processed: 0,
        failed: 0
      },
      images: {
        processed: 0,
        failed: 0
      }
    };
    
    // 处理所有待转写的录音
    for (const recording of classData.recordings) {
      if (recording.transcriptStatus === 'pending') {
        try {
          const audioPath = path.join(__dirname, '..', 'uploads', 'recordings', recording.filename);
          let transcript;
          try {
            transcript = await transcribeAudioEnhanced(audioPath);
          } catch (enhancedError) {
            console.log('批量处理中: 增强版转写失败，尝试基础版本');
            transcript = await transcribeAudioREST(audioPath);
          }
          recording.transcript = transcript;
          recording.transcriptStatus = 'completed';
          results.recordings.processed++;
        } catch (error) {
          recording.transcriptStatus = 'failed';
          results.recordings.failed++;
        }
      }
    }
    
    // 处理所有待识别的图片
    for (const image of classData.images) {
      if (image.ocrStatus === 'pending') {
        try {
          const imagePath = path.join(__dirname, '..', 'uploads', 'images', image.filename);
          const ocrResult = await extractTextFromImage(imagePath);
          image.ocrText = ocrResult.text;
          image.ocrStatus = 'completed';
          results.images.processed++;
        } catch (error) {
          image.ocrStatus = 'failed';
          results.images.failed++;
        }
      }
    }
    
    // 保存更新
    await classData.save();
    
    res.json({
      status: 'success',
      message: '批量处理完成',
      data: results
    });
    
  } catch (error) {
    console.error('批量处理错误:', error);
    res.status(500).json({
      status: 'error',
      message: '批量处理失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};