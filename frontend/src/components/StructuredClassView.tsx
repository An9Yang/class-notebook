import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractResponseData, extractErrorMessage } from '../utils/responseHandler';
import QAChat from './QAChat';
import BlockEditor from './BlockEditor';
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

interface TimelineEvent {
  eventId: string;
  type: 'image' | 'note';
  timestamp: number;
  data: {
    content?: string;
    imageId?: string;
  };
  createdAt: string;
}

interface Chapter {
  title: string;
  startTime: number;
  endTime: number;
  content: string;
  keyPoints: string[];
  relatedNotes?: number[];  // 时间戳数组
  relatedImages?: number[]; // 时间戳数组
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
  timelineEvents: TimelineEvent[];
  createdAt: string;
  aiOutline?: Chapter[];
}

const StructuredClassView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAI, setProcessingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'outline' | 'transcript' | 'edit'>('outline');
  const [showChat, setShowChat] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // 加载课堂数据
  useEffect(() => {
    loadClassData();
  }, [id]);

  const loadClassData = async () => {
    try {
      const response = await api.get(`/api/classes/${id}`);
      const data = extractResponseData(response, 'class');
      
      if (!data) {
        throw new Error('无法解析课堂数据');
      }
      
      setClassData(data);
      setNotes(data.notes || '');
      
      // 如果没有AI大纲且转写已完成，触发AI处理
      if (!data.aiOutline && data.recordings.some((r: Recording) => r.transcript)) {
        generateAIOutline(data);
      }
    } catch (error: any) {
      console.error('加载课堂数据失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`加载失败: ${errorMessage}`);
      
      if (error.response?.status === 404) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  // 生成AI大纲
  const generateAIOutline = async (classData: ClassData) => {
    setProcessingAI(true);
    
    try {
      // 准备内容：转写文本 + 时间轴事件
      const transcript = classData.recordings.map(r => r.transcript).join('\n');
      const events = classData.timelineEvents.sort((a, b) => a.timestamp - b.timestamp);
      
      // 构建上下文
      let context = `课程：${classData.courseName}\n教师：${classData.teacherName}\n\n`;
      context += '转写内容：\n' + transcript + '\n\n';
      context += '时间轴事件：\n';
      
      events.forEach(event => {
        const time = formatTime(event.timestamp);
        if (event.type === 'note') {
          context += `[${time}] 笔记：${event.data.content}\n`;
        } else if (event.type === 'image') {
          const image = classData.images.find(img => img._id === event.data.imageId);
          if (image?.ocrText) {
            context += `[${time}] 图片内容：${image.ocrText.substring(0, 100)}...\n`;
          }
        }
      });
      
      // 调用AI生成大纲
      const response = await api.post('/api/qa/generate-outline', {
        classId: classData._id,
        context
      });
      
      const outline = extractResponseData(response, 'outline');
      
      // 更新本地状态
      setClassData(prev => prev ? { ...prev, aiOutline: outline } : null);
      
    } catch (error: any) {
      console.error('生成AI大纲失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`生成大纲失败: ${errorMessage}`);
    } finally {
      setProcessingAI(false);
    }
  };

  // 根据时间戳获取相关的笔记
  const getRelatedNotes = (timestamps: number[] | undefined): TimelineEvent[] => {
    if (!timestamps || !classData) return [];
    return classData.timelineEvents.filter(
      event => event.type === 'note' && timestamps.includes(event.timestamp)
    );
  };

  // 根据时间戳获取相关的图片
  const getRelatedImages = (timestamps: number[] | undefined): Image[] => {
    if (!timestamps || !classData) return [];
    
    // 获取时间戳对应的图片ID
    const imageIds = classData.timelineEvents
      .filter(event => event.type === 'image' && timestamps.includes(event.timestamp))
      .map(event => event.data.imageId)
      .filter(id => id);
    
    // 返回对应的图片
    return classData.images.filter(img => imageIds.includes(img._id));
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

  // 切换章节展开/收起
  const toggleChapter = (index: number) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理图片OCR
  const processOCR = async (imageId: string) => {
    try {
      await api.post(`/api/process/ocr/${classData?._id}/${imageId}`);
      await loadClassData();
    } catch (error: any) {
      console.error('OCR识别失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`OCR识别失败: ${errorMessage}`);
    }
  };

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  if (!classData) {
    return <div style={styles.error}>课堂不存在</div>;
  }

  // 获取全部转写文本
  const fullTranscript = classData.recordings
    .map(r => r.transcript || '（转写中...）')
    .join('\n\n');

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
            style={{ ...styles.actionButton, backgroundColor: '#61dafb' }}
          >
            {showChat ? '隐藏助手' : '🤖 学习助手'}
          </button>
          <button onClick={() => navigate('/dashboard')} style={styles.actionButton}>
            返回
          </button>
        </div>
      </header>

      <div style={styles.content}>
        {/* 标签页切换 */}
        <div style={styles.tabs}>
          <button 
            onClick={() => setActiveTab('outline')}
            style={{
              ...styles.tab,
              ...(activeTab === 'outline' ? styles.activeTab : {})
            }}
          >
            📋 课堂大纲
          </button>
          <button 
            onClick={() => setActiveTab('transcript')}
            style={{
              ...styles.tab,
              ...(activeTab === 'transcript' ? styles.activeTab : {})
            }}
          >
            📄 完整转写
          </button>
          <button 
            onClick={() => setActiveTab('edit')}
            style={{
              ...styles.tab,
              ...(activeTab === 'edit' ? styles.activeTab : {})
            }}
          >
            ✏️ 编辑笔记
          </button>
        </div>

        {/* 大纲视图 */}
        {activeTab === 'outline' && (
          <div style={styles.outlineView}>
            {processingAI && (
              <div style={styles.processingMessage}>
                🤖 AI正在生成课堂大纲...
              </div>
            )}
            
            {/* 没有大纲时显示生成按钮 */}
            {!classData.aiOutline && !processingAI && classData.recordings.some(r => r.transcript && r.transcript.trim()) && (
              <div style={styles.generateOutlineContainer}>
                <p style={styles.generateOutlineText}>
                  转写已完成，可以生成AI课堂大纲
                </p>
                <button 
                  onClick={() => generateAIOutline(classData)}
                  style={styles.generateOutlineButton}
                >
                  🤖 生成课堂大纲
                </button>
              </div>
            )}
            
            {classData.aiOutline && classData.aiOutline.length > 0 ? (
              classData.aiOutline.map((chapter, index) => (
                <div key={index} style={styles.chapter}>
                  <div 
                    style={styles.chapterHeader}
                    onClick={() => toggleChapter(index)}
                  >
                    <h3>{chapter.title}</h3>
                    <span style={styles.chapterTime}>
                      {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                    </span>
                    <span style={styles.expandIcon}>
                      {expandedChapters.has(index) ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  {expandedChapters.has(index) && (
                    <div style={styles.chapterContent}>
                      {/* 关键点 */}
                      {chapter.keyPoints.length > 0 && (
                        <div style={styles.keyPoints}>
                          <h4>🎯 关键点</h4>
                          <ul>
                            {chapter.keyPoints.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* 转写内容 */}
                      <div style={styles.transcriptSection}>
                        <p>{chapter.content}</p>
                      </div>
                      
                      {/* 相关图片 */}
                      {(() => {
                        const relatedImages = getRelatedImages(chapter.relatedImages);
                        return relatedImages.length > 0 && (
                          <div style={styles.imagesSection}>
                            <h4>📸 相关图片</h4>
                            {relatedImages.map(image => (
                              <div key={image._id} style={styles.imageItem}>
                                <img 
                                  src={`http://localhost:3001${image.url}`} 
                                  alt="课堂图片"
                                  style={styles.thumbnail}
                                />
                                {image.ocrText ? (
                                  <OCRDisplay 
                                    text={image.ocrText} 
                                    tables={image.ocrTables}
                                  />
                                ) : (
                                  <button 
                                    onClick={() => processOCR(image._id)}
                                    style={styles.ocrButton}
                                  >
                                    识别文字
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      
                      {/* 相关笔记 */}
                      {(() => {
                        const relatedNotes = getRelatedNotes(chapter.relatedNotes);
                        return relatedNotes.length > 0 && (
                          <div style={styles.notesSection}>
                            <h4>📝 笔记</h4>
                            {relatedNotes.map(note => (
                              <div key={note.eventId} style={styles.noteItem}>
                                <span style={styles.noteTime}>{formatTime(note.timestamp)}</span>
                                <p>{note.data.content}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // 基础时间轴视图（没有AI大纲时）
              <div style={styles.timelineView}>
                <h3>📍 时间轴视图</h3>
                {classData.timelineEvents
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .map(event => {
                    const image = event.type === 'image' && event.data.imageId
                      ? classData.images.find(img => img._id === event.data.imageId)
                      : null;
                    
                    return (
                      <div key={event.eventId} style={styles.timelineItem}>
                        <span style={styles.timelineTime}>{formatTime(event.timestamp)}</span>
                        {event.type === 'note' ? (
                          <div style={styles.timelineNote}>
                            📝 {event.data.content}
                          </div>
                        ) : (
                          <div style={styles.timelineImageContainer}>
                            <div style={styles.timelineImage}>
                              📸 拍摄了照片
                            </div>
                            {image && (
                              <div style={styles.timelineImagePreview}>
                                <img 
                                  src={`http://localhost:3001${image.url}`} 
                                  alt="课堂图片"
                                  style={styles.timelineThumbnail}
                                />
                                {image.ocrText ? (
                                  <div style={styles.timelineOCR}>
                                    <OCRDisplay 
                                      text={image.ocrText} 
                                      tables={image.ocrTables}
                                    />
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => processOCR(image._id)}
                                    style={styles.ocrButton}
                                  >
                                    识别文字
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* 转写文本视图 */}
        {activeTab === 'transcript' && (
          <div style={styles.transcriptView}>
            <h3>完整转写文本</h3>
            <pre style={styles.transcriptText}>{fullTranscript}</pre>
          </div>
        )}

        {/* 笔记编辑视图 */}
        {activeTab === 'edit' && (
          <div style={styles.editView}>
            <div style={styles.editHeader}>
              <h3>编辑笔记</h3>
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
              placeholder="在这里整理你的课堂笔记..."
            />
          </div>
        )}
      </div>

      {/* 问答助手 */}
      {showChat && (
        <div style={styles.chatContainer}>
          <QAChat classId={classData._id} />
        </div>
      )}
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
  meta: {
    color: '#666',
    marginTop: '5px'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  actionButton: {
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
  tabs: {
    display: 'flex',
    gap: '5px',
    marginBottom: '20px',
    borderBottom: '2px solid #e0e0e0'
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s'
  },
  activeTab: {
    borderBottom: '3px solid #61dafb',
    color: '#61dafb',
    fontWeight: 'bold'
  },
  outlineView: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  processingMessage: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  chapter: {
    marginBottom: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  chapterHeader: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  chapterTime: {
    color: '#666',
    fontSize: '14px',
    marginLeft: 'auto'
  },
  expandIcon: {
    fontSize: '12px',
    color: '#666'
  },
  chapterContent: {
    padding: '20px',
    borderTop: '1px solid #e0e0e0'
  },
  keyPoints: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#fff3cd',
    borderRadius: '5px'
  },
  transcriptSection: {
    marginBottom: '20px',
    lineHeight: '1.8'
  },
  imagesSection: {
    marginBottom: '20px'
  },
  imageItem: {
    marginBottom: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '5px'
  },
  thumbnail: {
    maxWidth: '300px',
    maxHeight: '200px',
    marginBottom: '10px',
    borderRadius: '5px'
  },
  ocrButton: {
    padding: '8px 16px',
    backgroundColor: '#51cf66',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  notesSection: {
    marginBottom: '20px'
  },
  noteItem: {
    padding: '10px',
    backgroundColor: '#e3f2fd',
    borderRadius: '5px',
    marginBottom: '10px'
  },
  noteTime: {
    fontSize: '12px',
    color: '#666',
    marginRight: '10px'
  },
  timelineView: {
    padding: '20px'
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '15px',
    paddingLeft: '20px',
    borderLeft: '2px solid #e0e0e0'
  },
  timelineTime: {
    minWidth: '60px',
    color: '#666',
    fontSize: '14px'
  },
  timelineNote: {
    marginLeft: '20px',
    padding: '10px',
    backgroundColor: '#e3f2fd',
    borderRadius: '5px',
    flex: 1
  },
  timelineImage: {
    marginLeft: '20px',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
    flex: 1
  },
  timelineImageContainer: {
    marginLeft: '20px',
    flex: 1
  },
  timelineImagePreview: {
    marginTop: '10px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '5px'
  },
  timelineThumbnail: {
    maxWidth: '200px',
    maxHeight: '150px',
    marginBottom: '10px',
    borderRadius: '5px'
  },
  timelineOCR: {
    marginTop: '10px',
    fontSize: '14px'
  },
  transcriptView: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  transcriptText: {
    whiteSpace: 'pre-wrap',
    lineHeight: '1.8',
    fontSize: '16px',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    borderRadius: '5px',
    maxHeight: '600px',
    overflow: 'auto'
  },
  editView: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  editHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
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
  chatContainer: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 1000
  },
  generateOutlineContainer: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#f0f7ff',
    borderRadius: '10px',
    marginBottom: '20px'
  },
  generateOutlineText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '20px'
  },
  generateOutlineButton: {
    padding: '12px 24px',
    backgroundColor: '#61dafb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s'
  }
};

export default StructuredClassView;