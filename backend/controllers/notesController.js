const Class = require('../models/Class');

// 添加随堂笔记
exports.addQuickNote = async (req, res) => {
  try {
    const { classId } = req.params;
    const { content, timestamp } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: '笔记内容不能为空'
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
    
    // 添加时间轴事件
    const noteEvent = {
      eventId: `note-${Date.now()}`,
      type: 'note',
      timestamp: timestamp || 0,
      data: {
        content: content.trim()
      }
    };
    
    classData.timelineEvents.push(noteEvent);
    await classData.save();
    
    res.json({
      status: 'success',
      message: '笔记添加成功',
      data: {
        event: noteEvent
      }
    });
    
  } catch (error) {
    console.error('添加笔记错误:', error);
    res.status(500).json({
      status: 'error',
      message: '添加笔记失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 获取课堂的时间轴事件
exports.getTimelineEvents = async (req, res) => {
  try {
    const { classId } = req.params;
    
    const classData = await Class.findOne({
      _id: classId,
      userId: req.user.userId
    }).select('timelineEvents');
    
    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: '课堂不存在'
      });
    }
    
    // 按时间戳排序
    const sortedEvents = classData.timelineEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    res.json({
      status: 'success',
      data: {
        events: sortedEvents
      }
    });
    
  } catch (error) {
    console.error('获取时间轴事件错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取时间轴事件失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};