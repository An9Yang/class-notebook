import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractResponseData, extractErrorMessage } from '../utils/responseHandler';
import QAChat from './QAChat';
import BlockEditor from './BlockEditor';
import BlockEditorTips from './BlockEditorTips';
import OCRDisplay from './OCRDisplay';
import '../styles/RichTextEditor.css';

interface Recording {
  _id: string;
  filename: string;
  url: string;
  duration: number;
  transcript: string;
  transcriptStatus: string;
  uploadedAt: string;
}

interface Image {
  _id: string;
  filename: string;
  url: string;
  ocrText: string;
  ocrTables?: string[][][];
  ocrStatus: string;
  timestamp: number;
  uploadedAt: string;
}

interface ClassData {
  _id: string;
  title: string;
  description: string;
  courseName: string;
  teacherName: string;
  recordings: Recording[];
  images: Image[];
  notes: string;
  createdAt: string;
}

interface ExpandedState {
  [key: string]: boolean;
}

const ClassDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedTranscripts, setExpandedTranscripts] = useState<ExpandedState>({});
  const [expandedOCR, setExpandedOCR] = useState<ExpandedState>({});
  const [showChat, setShowChat] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载课堂数据
  useEffect(() => {
    loadClassData();
  }, [id]);

  // 定时刷新，检查处理状态
  useEffect(() => {
    if (!classData) return;
    
    const hasProcessing = 
      classData.recordings.some(r => r.transcriptStatus === 'processing') ||
      classData.images.some(i => i.ocrStatus === 'processing');
    
    if (hasProcessing) {
      const interval = setInterval(() => {
        console.log('检查处理状态...');
        loadClassData();
      }, 3000); // 每3秒检查一次
      
      return () => clearInterval(interval);
    }
  }, [classData]);

  const loadClassData = async () => {
    try {
      console.log('开始加载课堂数据，ID:', id);
      const response = await api.get(`/api/classes/${id}`);
      console.log('原始响应:', response);
      
      // 使用工具函数处理响应
      const data = extractResponseData(response, 'class');
      if (!data) {
        console.error('未知的响应格式:', response);
        throw new Error('无法解析课堂数据');
      }
      
      console.log('课堂数据:', data);
      
      // 详细记录录音数据
      if (data.recordings && data.recordings.length > 0) {
        console.log('=== 录音数据详情 ===');
        data.recordings.forEach((recording: Recording, index: number) => {
          console.log(`录音 ${index + 1}:`, {
            id: recording._id,
            filename: recording.filename,
            transcriptStatus: recording.transcriptStatus,
            hasTranscript: !!recording.transcript,
            transcriptLength: recording.transcript ? recording.transcript.length : 0,
            transcriptPreview: recording.transcript ? recording.transcript.substring(0, 50) : null
          });
        });
      }
      
      setClassData(data);
      setNotes(data.notes || '');
    } catch (error: any) {
      console.error('加载课堂数据失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`加载失败: ${errorMessage}`);
      
      // 如果是404错误，可能需要返回主页
      if (error.response?.status === 404) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  // 保存笔记
  const saveNotes = async () => {
    if (!classData) return;
    
    setSaving(true);
    try {
      await api.put(`/api/classes/${classData._id}`, { notes });
      alert('笔记保存成功');
    } catch (error: any) {
      console.error('保存笔记失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`保存失败: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // 触发录音转写
  const transcribeRecording = async (recordingId: string) => {
    try {
      const response = await api.post(`/api/process/transcribe/${classData?._id}/${recordingId}`);
      const { transcript } = response as any;
      
      // 更新本地状态
      if (classData) {
        const updatedRecordings = classData.recordings.map(rec => 
          rec._id === recordingId 
            ? { ...rec, transcript, transcriptStatus: 'completed' }
            : rec
        );
        setClassData({ ...classData, recordings: updatedRecordings });
      }
      
      alert('转写成功！');
    } catch (error: any) {
      console.error('转写失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`转写失败: ${errorMessage}`);
    }
  };

  // 选择图片
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  // 上传图片
  const uploadImage = async () => {
    if (!selectedImage || !classData) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('classId', classData._id);
    formData.append('timestamp', '0'); // 可以传入实际的时间戳
    
    try {
      await api.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('图片上传成功！');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // 重新加载数据
      await loadClassData();
    } catch (error: any) {
      console.error('上传图片失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`上传失败: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  // 触发OCR识别
  const processOCR = async (imageId: string) => {
    // 先更新状态为处理中
    if (classData) {
      const updatedImages = classData.images.map(img => 
        img._id === imageId 
          ? { ...img, ocrStatus: 'processing' }
          : img
      );
      setClassData({ ...classData, images: updatedImages });
    }
    
    try {
      const response = await api.post(`/api/process/ocr/${classData?._id}/${imageId}`);
      const data = extractResponseData(response);
      const { text, tables } = data;
      
      // 更新本地状态
      if (classData) {
        const updatedImages = classData.images.map(img => 
          img._id === imageId 
            ? { ...img, ocrText: text, ocrTables: tables, ocrStatus: 'completed' }
            : img
        );
        setClassData({ ...classData, images: updatedImages });
      }
      
      // 不再弹出提示，直接显示结果
    } catch (error: any) {
      console.error('OCR识别失败:', error);
      const errorMessage = extractErrorMessage(error);
      
      // 恢复状态
      if (classData) {
        const updatedImages = classData.images.map(img => 
          img._id === imageId 
            ? { ...img, ocrStatus: 'failed' }
            : img
        );
        setClassData({ ...classData, images: updatedImages });
      }
      
      alert(`OCR识别失败: ${errorMessage}`);
    }
  };

  // 批量处理
  const processAll = async () => {
    if (!classData) return;
    
    try {
      const response = await api.post(`/api/process/class/${classData._id}`);
      alert('批量处理已启动，请稍后刷新查看结果');
      
      // 重新加载数据
      setTimeout(() => loadClassData(), 3000);
    } catch (error: any) {
      console.error('批量处理失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`批量处理失败: ${errorMessage}`);
    }
  };

  // 切换转写内容展开/收起
  const toggleTranscript = (recordingId: string) => {
    setExpandedTranscripts(prev => ({
      ...prev,
      [recordingId]: !prev[recordingId]
    }));
  };

  // 切换OCR内容展开/收起
  const toggleOCR = (imageId: string) => {
    setExpandedOCR(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }));
  };

  // 截断文本
  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // 删除录音
  const deleteRecording = async (recordingId: string) => {
    if (!window.confirm('确定要删除这个录音吗？此操作不可恢复。')) {
      return;
    }
    
    try {
      await api.delete(`/api/classes/${classData?._id}/recording/${recordingId}`);
      alert('录音删除成功');
      await loadClassData(); // 重新加载数据
    } catch (error: any) {
      console.error('删除录音失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`删除失败: ${errorMessage}`);
    }
  };

  // 删除图片
  const deleteImage = async (imageId: string) => {
    if (!window.confirm('确定要删除这张图片吗？此操作不可恢复。')) {
      return;
    }
    
    try {
      await api.delete(`/api/classes/${classData?._id}/image/${imageId}`);
      alert('图片删除成功');
      await loadClassData(); // 重新加载数据
    } catch (error: any) {
      console.error('删除图片失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`删除失败: ${errorMessage}`);
    }
  };

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  if (!classData) {
    return <div style={styles.error}>课堂不存在</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1>{classData.title}</h1>
          <p style={styles.meta}>
            {classData.courseName && `课程：${classData.courseName} | `}
            {classData.teacherName && `教师：${classData.teacherName} | `}
            创建时间：{new Date(classData.createdAt).toLocaleString()}
          </p>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={() => setShowChat(!showChat)} 
            style={{ ...styles.backButton, backgroundColor: '#61dafb' }}
          >
            {showChat ? '隐藏助手' : '🤖 学习助手'}
          </button>
          <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
            返回
          </button>
        </div>
      </header>

      <div style={styles.content}>
        {/* 录音部分 */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>🎙️ 录音</h2>
            <button onClick={processAll} style={styles.processButton}>
              批量处理所有内容
            </button>
          </div>
          
          {classData.recordings.length === 0 ? (
            <p style={styles.empty}>暂无录音</p>
          ) : (
            classData.recordings.map(recording => (
              <div key={recording._id} style={styles.recordingCard}>
                <div style={styles.recordingHeader}>
                  <audio controls src={`http://localhost:3001${recording.url}`} style={styles.audio} />
                  <button 
                    onClick={() => deleteRecording(recording._id)}
                    style={styles.deleteButton}
                    title="删除录音"
                  >
                    🗑️
                  </button>
                </div>
                <div style={styles.recordingInfo}>
                  <p>上传时间：{new Date(recording.uploadedAt).toLocaleString()}</p>
                  <p>状态：{recording.transcriptStatus}</p>
                  
                  {recording.transcriptStatus === 'pending' && (
                    <button 
                      onClick={() => transcribeRecording(recording._id)}
                      style={styles.actionButton}
                    >
                      开始转写
                    </button>
                  )}
                  
                  {recording.transcriptStatus === 'processing' && (
                    <p style={{color: '#666'}}>正在转写中...</p>
                  )}
                  
                  {recording.transcriptStatus === 'failed' && (
                    <p style={{color: '#ff6b6b'}}>转写失败</p>
                  )}
                  
                  {(recording.transcript || recording.transcriptStatus === 'completed') && (
                    <div style={styles.transcript}>
                      <h4>转写内容：</h4>
                      <p style={styles.transcriptText}>
                        {recording.transcript ? (
                          expandedTranscripts[recording._id] 
                            ? recording.transcript 
                            : truncateText(recording.transcript)
                        ) : (
                          <span style={{color: '#999', fontStyle: 'italic'}}>
                            未检测到语音内容。请确保录音包含清晰的语音，并尝试重新转写。
                          </span>
                        )}
                      </p>
                      {recording.transcript && recording.transcript.length > 200 && (
                        <button
                          onClick={() => toggleTranscript(recording._id)}
                          style={styles.toggleButton}
                        >
                          {expandedTranscripts[recording._id] ? '收起' : '展开全文'}
                        </button>
                      )}
                      {recording.transcriptStatus === 'completed' && !recording.transcript && (
                        <button 
                          onClick={() => transcribeRecording(recording._id)}
                          style={{...styles.actionButton, marginTop: '10px'}}
                        >
                          重新转写
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        {/* 图片部分 */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>📸 图片</h2>
            <div style={styles.uploadSection}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={styles.fileInput}
              />
              {selectedImage && (
                <button 
                  onClick={uploadImage}
                  disabled={uploading}
                  style={styles.uploadButton}
                >
                  {uploading ? '上传中...' : '上传图片'}
                </button>
              )}
            </div>
          </div>
          
          {classData.images.length === 0 ? (
            <p style={styles.empty}>暂无图片</p>
          ) : (
            <div style={styles.imageGrid}>
              {classData.images.map(image => (
                <div key={image._id} style={styles.imageCard}>
                  <div style={styles.imageHeader}>
                    <img 
                      src={`http://localhost:3001${image.url}`} 
                      alt="课堂图片"
                      style={styles.image}
                    />
                    <button 
                      onClick={() => deleteImage(image._id)}
                      style={{ ...styles.deleteButton, ...styles.imageDeleteButton }}
                      title="删除图片"
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={styles.imageInfo}>
                    <p>上传时间：{new Date(image.uploadedAt).toLocaleString()}</p>
                    <p>OCR状态：{image.ocrStatus}</p>
                    
                    {image.ocrStatus === 'pending' && (
                      <button 
                        onClick={() => processOCR(image._id)}
                        style={styles.actionButton}
                      >
                        识别文字
                      </button>
                    )}
                    
                    {image.ocrStatus === 'processing' && (
                      <div style={styles.processingMessage}>
                        <span style={styles.spinner}>⏳</span> 正在识别中...
                      </div>
                    )}
                    
                    {(image.ocrText || image.ocrTables) && (
                      <div style={styles.ocrText}>
                        <h4>识别内容：</h4>
                        <OCRDisplay 
                          text={image.ocrText} 
                          tables={image.ocrTables}
                        />
                        {/* 如果内容很长，提供展开/收起功能 */}
                        {image.ocrText && image.ocrText.length > 500 && (
                          <button
                            onClick={() => toggleOCR(image._id)}
                            style={styles.toggleButton}
                          >
                            {expandedOCR[image._id] ? '收起' : '展开全文'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 笔记部分 */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>📝 笔记</h2>
            <button 
              onClick={saveNotes}
              disabled={saving}
              style={styles.saveButton}
            >
              {saving ? '保存中...' : '保存笔记'}
            </button>
          </div>
          
          <BlockEditor
            content={notes}
            onChange={setNotes}
            placeholder="输入 '/' 查看命令，或点击 '+' 添加内容块"
          />
        </section>
      </div>

      {/* 问答助手 */}
      {showChat && (
        <div style={styles.chatContainer}>
          <QAChat classId={classData._id} />
        </div>
      )}
      
      {/* 编辑器提示 */}
      <BlockEditorTips />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5'
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 40px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  meta: {
    color: '#666',
    marginTop: '5px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  content: {
    padding: '20px 40px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  section: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  processButton: {
    padding: '10px 20px',
    backgroundColor: '#61dafb',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  recordingCard: {
    border: '1px solid #eee',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  recordingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  audio: {
    flex: '1',
    marginBottom: '0'
  },
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.2s'
  },
  recordingInfo: {
    fontSize: '14px',
    color: '#666'
  },
  transcript: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '5px'
  },
  transcriptText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.6'
  },
  toggleButton: {
    marginTop: '10px',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#61dafb',
    border: '1px solid #61dafb',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  actionButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#51cf66',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  uploadSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  fileInput: {
    fontSize: '14px'
  },
  uploadButton: {
    padding: '8px 16px',
    backgroundColor: '#61dafb',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  imageCard: {
    border: '1px solid #eee',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  imageHeader: {
    position: 'relative'
  },
  image: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    display: 'block'
  },
  imageDeleteButton: {
    position: 'absolute',
    top: '10px',
    right: '10px'
  },
  imageInfo: {
    padding: '15px',
    fontSize: '14px',
    color: '#666'
  },
  ocrText: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '5px'
  },
  ocrTextContent: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.8',
    fontFamily: 'monospace',
    fontSize: '14px',
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #e0e0e0'
  },
  processingMessage: {
    display: 'flex',
    alignItems: 'center',
    color: '#1976d2',
    marginTop: '10px',
    fontSize: '14px'
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
    fontSize: '16px'
  },
  notesArea: {
    width: '100%',
    minHeight: '300px',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '16px',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#51cf66',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '20px',
    color: '#666'
  },
  error: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '20px',
    color: '#ff6b6b'
  },
  empty: {
    color: '#999',
    textAlign: 'center',
    padding: '40px'
  },
  chatContainer: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 1000
  }
};

export default ClassDetail;