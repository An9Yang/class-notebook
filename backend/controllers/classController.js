const Class = require('../models/Class');

// 创建新课堂
const createClass = async (req, res) => {
  try {
    const { title, description, courseName, teacherName } = req.body;
    const userId = req.user.userId;
    
    const newClass = new Class({
      userId,
      title: title || `课堂笔记 ${new Date().toLocaleDateString()}`,
      description,
      courseName,
      teacherName
    });
    
    await newClass.save();
    
    res.status(201).json({
      status: 'success',
      message: '课堂创建成功',
      class: newClass
    });
  } catch (error) {
    console.error('创建课堂错误:', error);
    res.status(500).json({
      status: 'error',
      message: '创建课堂失败',
      error: error.message
    });
  }
};

// 获取我的课堂列表
const getMyClasses = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const classes = await Class.find({ userId })
      .sort({ createdAt: -1 });
    
    res.json({
      status: 'success',
      classes
    });
  } catch (error) {
    console.error('获取课堂列表错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取课堂列表失败',
      error: error.message
    });
  }
};

// 获取课堂详情
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    console.log('=== 获取课堂详情 ===');
    console.log('课堂ID:', id);
    console.log('用户ID:', userId);
    
    const classData = await Class.findOne({ _id: id, userId });
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    console.log('=== 课堂数据 ===');
    console.log('课堂标题:', classData.title);
    console.log('录音数量:', classData.recordings.length);
    
    // 打印每个录音的详细信息
    classData.recordings.forEach((recording, index) => {
      console.log(`--- 录音 ${index + 1} ---`);
      console.log('录音ID:', recording._id);
      console.log('文件名:', recording.filename);
      console.log('转写状态:', recording.transcriptStatus);
      console.log('是否有transcript:', !!recording.transcript);
      console.log('transcript长度:', recording.transcript ? recording.transcript.length : 0);
      console.log('transcript前100字符:', recording.transcript ? recording.transcript.substring(0, 100) : 'null');
    });
    
    console.log('=== 响应数据概览 ===');
    console.log('响应中的录音数量:', classData.recordings.length);
    
    res.json({
      status: 'success',
      class: classData
    });
  } catch (error) {
    console.error('获取课堂详情错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取课堂详情失败',
      error: error.message
    });
  }
};

// 更新课堂信息
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;
    
    const classData = await Class.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    res.json({
      status: 'success',
      message: '课堂更新成功',
      class: classData
    });
  } catch (error) {
    console.error('更新课堂错误:', error);
    res.status(500).json({
      status: 'error',
      message: '更新课堂失败',
      error: error.message
    });
  }
};

// 删除课堂
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const classData = await Class.findOneAndDelete({ _id: id, userId });
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    // 删除相关的文件
    const fs = require('fs');
    const path = require('path');
    
    // 删除录音文件
    for (const recording of classData.recordings) {
      const recordingPath = path.join(__dirname, '..', 'uploads', 'recordings', recording.filename);
      try {
        if (fs.existsSync(recordingPath)) {
          fs.unlinkSync(recordingPath);
        }
      } catch (err) {
        console.error('删除录音文件失败:', err);
      }
    }
    
    // 删除图片文件
    for (const image of classData.images) {
      const imagePath = path.join(__dirname, '..', 'uploads', 'images', image.filename);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.error('删除图片文件失败:', err);
      }
    }
    
    res.json({
      status: 'success',
      message: '课堂删除成功'
    });
  } catch (error) {
    console.error('删除课堂错误:', error);
    res.status(500).json({
      status: 'error',
      message: '删除课堂失败',
      error: error.message
    });
  }
};

// 删除录音
const deleteRecording = async (req, res) => {
  try {
    const { classId, recordingId } = req.params;
    const userId = req.user.userId;
    
    // 查找课堂
    const classData = await Class.findOne({ _id: classId, userId });
    
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
    
    // 删除文件
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'uploads', 'recordings', recording.filename);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('删除录音文件失败:', fileError);
    }
    
    // 从数据库中删除录音记录
    classData.recordings.pull(recordingId);
    await classData.save();
    
    res.json({
      status: 'success',
      message: '录音删除成功'
    });
    
  } catch (error) {
    console.error('删除录音错误:', error);
    res.status(500).json({
      status: 'error',
      message: '删除录音失败',
      error: error.message
    });
  }
};

// 删除图片
const deleteImage = async (req, res) => {
  try {
    const { classId, imageId } = req.params;
    const userId = req.user.userId;
    
    // 查找课堂
    const classData = await Class.findOne({ _id: classId, userId });
    
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
    
    // 删除文件
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'uploads', 'images', image.filename);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('删除图片文件失败:', fileError);
    }
    
    // 从数据库中删除图片记录
    classData.images.pull(imageId);
    await classData.save();
    
    res.json({
      status: 'success',
      message: '图片删除成功'
    });
    
  } catch (error) {
    console.error('删除图片错误:', error);
    res.status(500).json({
      status: 'error',
      message: '删除图片失败',
      error: error.message
    });
  }
};

module.exports = {
  createClass,
  getMyClasses,
  getClassById,
  updateClass,
  deleteClass,
  deleteRecording,
  deleteImage
};