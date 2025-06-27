const Class = require('../models/Class');
const path = require('path');
const { transcribeAudioREST } = require('../services/azureSpeechSimple');
const { transcribeAudioEnhanced } = require('../services/azureSpeechEnhanced');

// 上传录音文件
exports.uploadRecording = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: '请选择要上传的录音文件'
      });
    }

    const { classId } = req.body;
    
    if (!classId) {
      return res.status(400).json({
        status: 'error',
        message: '请提供课堂ID'
      });
    }

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

    // 构建录音信息
    const recording = {
      filename: req.file.filename,
      url: `/uploads/recordings/${req.file.filename}`,
      size: req.file.size,
      duration: 0, // 需要前端传递或后端计算
      transcriptStatus: 'pending'
    };

    // 添加录音到课堂
    classData.recordings.push(recording);
    const savedClass = await classData.save();

    // 获取新添加的录音的ID
    const newRecordingId = savedClass.recordings[savedClass.recordings.length - 1]._id;

    // 自动触发转写
    try {
      const audioPath = path.join(__dirname, '..', 'uploads', 'recordings', req.file.filename);
      console.log('=== 开始自动转写 ===');
      console.log('文件路径:', audioPath);
      console.log('文件是否存在:', require('fs').existsSync(audioPath));
      console.log('文件大小:', require('fs').statSync(audioPath).size, 'bytes');
      
      // 先尝试增强版转写
      let transcript;
      try {
        transcript = await transcribeAudioEnhanced(audioPath);
      } catch (enhancedError) {
        console.log('增强版转写失败，尝试基础版本:', enhancedError.message);
        transcript = await transcribeAudioREST(audioPath);
      }
      console.log('=== 转写结果 ===');
      console.log('转写内容:', transcript);
      console.log('转写内容长度:', transcript ? transcript.length : 0);
      console.log('转写内容类型:', typeof transcript);
      
      // 重新查询并更新转写结果
      const updatedClass = await Class.findById(classId);
      const recordingToUpdate = updatedClass.recordings.id(newRecordingId);
      
      console.log('=== 更新前的录音记录 ===');
      console.log('录音ID:', recordingToUpdate._id);
      console.log('当前transcript:', recordingToUpdate.transcript);
      console.log('当前状态:', recordingToUpdate.transcriptStatus);
      
      recordingToUpdate.transcript = transcript;
      recordingToUpdate.transcriptStatus = 'completed';
      
      console.log('=== 更新后的录音记录 ===');
      console.log('新transcript:', recordingToUpdate.transcript);
      console.log('新状态:', recordingToUpdate.transcriptStatus);
      
      await updatedClass.save();
      
      // 再次查询验证保存结果
      const verifyClass = await Class.findById(classId);
      const verifyRecording = verifyClass.recordings.id(newRecordingId);
      console.log('=== 验证保存结果 ===');
      console.log('数据库中的transcript:', verifyRecording.transcript);
      console.log('数据库中的状态:', verifyRecording.transcriptStatus);
      
      console.log('=== 响应数据 ===');
      console.log('返回的recording对象:', JSON.stringify(recordingToUpdate, null, 2));
      
      res.json({
        status: 'success',
        message: '录音上传成功',
        data: {
          recording: recordingToUpdate
        }
      });
    } catch (transcribeError) {
      console.error('=== 自动转写失败 ===');
      console.error('错误类型:', transcribeError.name);
      console.error('错误消息:', transcribeError.message);
      console.error('错误堆栈:', transcribeError.stack);
      
      // 转写失败时更新状态
      const updatedClass = await Class.findById(classId);
      const recordingToUpdate = updatedClass.recordings.id(newRecordingId);
      recordingToUpdate.transcriptStatus = 'failed';
      await updatedClass.save();
      
      res.json({
        status: 'success',
        message: '录音上传成功，但转写失败',
        data: {
          recording: recordingToUpdate
        }
      });
    }

  } catch (error) {
    console.error('上传录音错误:', error);
    res.status(500).json({
      status: 'error',
      message: '上传录音失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 上传图片
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: '请选择要上传的图片'
      });
    }

    const { classId, timestamp } = req.body;
    
    if (!classId) {
      return res.status(400).json({
        status: 'error',
        message: '请提供课堂ID'
      });
    }

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

    // 构建图片信息
    const image = {
      filename: req.file.filename,
      url: `/uploads/images/${req.file.filename}`,
      size: req.file.size,
      timestamp: timestamp ? parseInt(timestamp) : 0,
      ocrStatus: 'pending'
    };

    // 添加图片到课堂
    classData.images.push(image);
    await classData.save();

    res.json({
      status: 'success',
      message: '图片上传成功',
      data: {
        image: classData.images[classData.images.length - 1]
      }
    });

  } catch (error) {
    console.error('上传图片错误:', error);
    res.status(500).json({
      status: 'error',
      message: '上传图片失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};