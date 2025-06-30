import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractResponseData, extractErrorMessage } from '../utils/responseHandler';

interface TimelineEvent {
  id: string;
  type: 'image' | 'note';
  timestamp: number; // 秒数
  data: {
    content?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
  };
}

const IntegratedClassRoom: React.FC = () => {
  // 基础信息 - 确保初始值不是 undefined
  const [title, setTitle] = useState('');
  const [courseName, setCourseName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  
  // 录音状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // 时间轴事件
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  
  // 笔记输入
  const [currentNote, setCurrentNote] = useState('');
  
  // 照片相关
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // 引用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 创建课堂
  const createClass = async () => {
    try {
      const response = await api.post('/api/classes', {
        title: title || `课堂笔记 ${new Date().toLocaleDateString()}`,
        description: `${courseName} - ${teacherName}`,
        courseName,
        teacherName
      });
      
      const classData = extractResponseData(response, 'class');
      if (!classData || !classData._id) {
        throw new Error('无法获取课堂ID');
      }
      
      const newClassId = classData._id;
      setClassId(newClassId);
      return newClassId;
    } catch (error: any) {
      console.error('创建课堂失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`创建课堂失败: ${errorMessage}`);
      return null;
    }
  };

  // 开始录音
  const startRecording = async () => {
    try {
      // 如果还没有创建课堂，先创建
      let currentClassId = classId;
      if (!currentClassId) {
        currentClassId = await createClass();
        if (!currentClassId) return;
      }

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 创建MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      // 开始录音
      mediaRecorder.start();
      setIsRecording(true);

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('开始录音失败:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // 添加笔记
  const addNote = useCallback(async () => {
    if (!currentNote.trim() || !classId) return;
    
    try {
      // 保存到后端
      const response = await api.post(`/api/notes/${classId}/quick-note`, {
        content: currentNote.trim(),
        timestamp: recordingTime
      });
      
      const eventData = extractResponseData(response, 'event');
      
      // 更新本地状态
      const newEvent: TimelineEvent = {
        id: eventData.eventId,
        type: 'note',
        timestamp: recordingTime,
        data: {
          content: currentNote.trim()
        }
      };
      
      setEvents(prev => [...prev, newEvent]);
      setCurrentNote('');
    } catch (error: any) {
      console.error('添加笔记失败:', error);
      alert('添加笔记失败');
    }
  }, [currentNote, recordingTime, classId]);

  // 处理图片选择
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      uploadImage(file);
    }
  };

  // 上传图片
  const uploadImage = async (file: File) => {
    if (!classId) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('classId', classId);
    formData.append('timestamp', recordingTime.toString());
    
    try {
      const response = await api.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const imageData = extractResponseData(response);
      
      // 添加到时间轴
      const newEvent: TimelineEvent = {
        id: `image-${Date.now()}`,
        type: 'image',
        timestamp: recordingTime,
        data: {
          imageUrl: imageData.url,
          thumbnailUrl: imageData.url // 暂时使用相同URL
        }
      };
      
      setEvents(prev => [...prev, newEvent]);
      
      // 清空选择
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('上传图片失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`上传失败: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 完成录音并上传
  const finishClass = async () => {
    if (!audioBlob || !classId) {
      alert('请先录制音频');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
    formData.append('classId', classId);
    formData.append('events', JSON.stringify(events)); // 传递时间轴事件

    try {
      await api.post('/api/upload/recording', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('课堂记录已保存！');
      navigate(`/class/${classId}`);
    } catch (error: any) {
      console.error('上传录音失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`上传失败: ${errorMessage}`);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 根据录音状态显示不同界面
  if (!isRecording && !audioBlob) {
    // 初始界面：输入基本信息
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1>开始上课</h1>
          <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
            返回
          </button>
        </div>

        <div style={styles.setupSection}>
          <div style={styles.formGroup}>
            <input
              type="text"
              value={title || ''}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="课堂标题（选填）"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="text"
              value={courseName || ''}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="课程名称"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="text"
              value={teacherName || ''}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="教师姓名"
              style={styles.input}
            />
          </div>

          <button onClick={startRecording} style={styles.startButton}>
            🎙️ 开始上课
          </button>
        </div>
      </div>
    );
  }

  if (audioBlob) {
    // 录音结束界面
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1>课堂结束</h1>
        </div>

        <div style={styles.summarySection}>
          <h2>📊 课堂统计</h2>
          <p>录音时长：{formatTime(recordingTime)}</p>
          <p>拍摄照片：{events.filter(e => e.type === 'image').length} 张</p>
          <p>笔记数量：{events.filter(e => e.type === 'note').length} 条</p>

          <div style={styles.buttonGroup}>
            <button onClick={finishClass} style={styles.finishButton}>
              ✅ 保存并完成
            </button>
            <button 
              onClick={() => {
                setAudioBlob(null);
                setRecordingTime(0);
                setEvents([]);
              }} 
              style={styles.cancelButton}
            >
              重新录制
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 录音中界面
  return (
    <div style={styles.container}>
      <div style={styles.recordingHeader}>
        <div style={styles.recordingStatus}>
          <span style={styles.recordingDot}>🔴</span>
          正在录音 {formatTime(recordingTime)}
        </div>
        <button onClick={stopRecording} style={styles.stopButton}>
          结束课堂
        </button>
      </div>

      <div style={styles.mainContent}>
        {/* 拍照区域 */}
        <div style={styles.actionSection}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
            capture="environment"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={styles.cameraButton}
          >
            📸 拍照
            <span style={styles.badge}>
              {events.filter(e => e.type === 'image').length}
            </span>
          </button>
        </div>

        {/* 笔记区域 */}
        <div style={styles.noteSection}>
          <h3>📝 随堂笔记</h3>
          <div style={styles.noteInput}>
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addNote();
                }
              }}
              placeholder="记录重点内容...（按Enter添加）"
              style={styles.noteTextarea}
            />
            <button onClick={addNote} style={styles.addNoteButton}>
              添加
            </button>
          </div>
        </div>

        {/* 最近记录 */}
        <div style={styles.recentSection}>
          <h3>📍 最近记录</h3>
          <div style={styles.eventList}>
            {events.slice(-5).reverse().map((event, index) => (
              <div key={`${event.id}-${index}`} style={styles.eventItem}>
                {event.type === 'image' ? (
                  <>
                    <span style={styles.eventIcon}>📸</span>
                    <span>照片</span>
                  </>
                ) : (
                  <>
                    <span style={styles.eventIcon}>📝</span>
                    <span>{event.data.content?.substring(0, 20)}...</span>
                  </>
                )}
                <span style={styles.eventTime}>{formatTime(event.timestamp)}</span>
              </div>
            ))}
            {events.length === 0 && (
              <p style={styles.emptyText}>还没有记录</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    backgroundColor: 'white',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  setupSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    maxWidth: '400px',
    margin: '0 auto',
    width: '100%'
  },
  formGroup: {
    width: '100%',
    marginBottom: '20px'
  },
  input: {
    width: '100%',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  startButton: {
    width: '100%',
    padding: '20px',
    fontSize: '24px',
    backgroundColor: '#61dafb',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginTop: '20px'
  },
  recordingHeader: {
    backgroundColor: 'white',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recordingStatus: {
    fontSize: '20px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  recordingDot: {
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  stopButton: {
    padding: '10px 20px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  mainContent: {
    flex: 1,
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%'
  },
  actionSection: {
    marginBottom: '30px'
  },
  cameraButton: {
    width: '100%',
    padding: '40px',
    fontSize: '24px',
    backgroundColor: 'white',
    border: '2px dashed #ddd',
    borderRadius: '12px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.3s'
  },
  badge: {
    position: 'absolute',
    top: '10px',
    right: '20px',
    backgroundColor: '#61dafb',
    color: 'white',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px'
  },
  noteSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px'
  },
  noteInput: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px'
  },
  noteTextarea: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    resize: 'none',
    minHeight: '60px'
  },
  addNoteButton: {
    padding: '10px 20px',
    backgroundColor: '#51cf66',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  recentSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px'
  },
  eventList: {
    marginTop: '10px'
  },
  eventItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #f0f0f0',
    gap: '10px'
  },
  eventIcon: {
    fontSize: '20px'
  },
  eventTime: {
    marginLeft: 'auto',
    color: '#999',
    fontSize: '14px'
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: '20px'
  },
  summarySection: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    margin: '20px',
    textAlign: 'center'
  },
  buttonGroup: {
    marginTop: '30px',
    display: 'flex',
    gap: '20px',
    justifyContent: 'center'
  },
  finishButton: {
    padding: '15px 30px',
    fontSize: '18px',
    backgroundColor: '#51cf66',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '15px 30px',
    fontSize: '18px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer'
  }
};

// 添加动画
const globalStyles = `
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
`;

// 注入样式
const styleSheet = document.createElement("style");
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

export default IntegratedClassRoom;