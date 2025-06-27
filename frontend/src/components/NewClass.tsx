import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractResponseData, extractErrorMessage } from '../utils/responseHandler';

const NewClass: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseName, setCourseName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [classId, setClassId] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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
        description,
        courseName,
        teacherName
      });
      
      // 使用工具函数处理响应
      const classData = extractResponseData(response, 'class');
      if (!classData || !classData._id) {
        console.error('未知的响应格式:', response);
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
        
        // 停止所有音轨
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
      
      // 停止计时
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // 上传录音
  const uploadRecording = async () => {
    if (!audioBlob || !classId) {
      alert('请先录制音频');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
    formData.append('classId', classId);

    try {
      await api.post('/api/upload/recording', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('录音上传成功，正在自动转写...');
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>创建新课堂</h1>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          返回
        </button>
      </div>

      <div style={styles.formSection}>
        <div style={styles.formGroup}>
          <label style={styles.label}>课堂标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：高等数学第一章"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>课程名称</label>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="例如：高等数学"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>教师姓名</label>
          <input
            type="text"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            placeholder="例如：王老师"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>课堂描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="添加一些描述..."
            style={{ ...styles.input, minHeight: '100px' }}
          />
        </div>
      </div>

      <div style={styles.recordingSection}>
        <h2>录音</h2>
        
        <div style={styles.recordingControls}>
          {!audioBlob ? (
            <>
              <div style={styles.timer}>
                {formatTime(recordingTime)}
              </div>
              
              {!isRecording ? (
                <button onClick={startRecording} style={styles.recordButton}>
                  🎙️ 开始录音
                </button>
              ) : (
                <button onClick={stopRecording} style={styles.stopButton}>
                  ⏹️ 停止录音
                </button>
              )}
            </>
          ) : (
            <div style={styles.uploadSection}>
              <p>录音完成！时长：{formatTime(recordingTime)}</p>
              <button onClick={uploadRecording} style={styles.uploadButton}>
                📤 上传录音并完成
              </button>
              <button 
                onClick={() => {
                  setAudioBlob(null);
                  setRecordingTime(0);
                }} 
                style={styles.cancelButton}
              >
                重新录制
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  formSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#666'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  recordingSection: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  recordingControls: {
    marginTop: '20px'
  },
  timer: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px'
  },
  recordButton: {
    padding: '20px 40px',
    fontSize: '20px',
    backgroundColor: '#61dafb',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  stopButton: {
    padding: '20px 40px',
    fontSize: '20px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  uploadSection: {
    marginTop: '20px'
  },
  uploadButton: {
    padding: '15px 30px',
    fontSize: '18px',
    backgroundColor: '#51cf66',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    margin: '10px'
  },
  cancelButton: {
    padding: '15px 30px',
    fontSize: '18px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    margin: '10px'
  }
};

export default NewClass;