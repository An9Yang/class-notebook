import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractResponseData, extractErrorMessage } from '../utils/responseHandler';
import QAChat from './QAChat';
import BlockEditor from './BlockEditor';
import OCRDisplay from './OCRDisplay';
import '../styles/RichTextEditor.css';
import '../styles/BlockEditor.css';

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
  const [viewMode, setViewMode] = useState<'outline' | 'transcript'>('outline');
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [chapterContents, setChapterContents] = useState<{ [key: number]: Chapter }>({});

  // 加载课堂数据
  useEffect(() => {
    loadClassData();
  }, [id]);

  // 默认展开前几个章节
  useEffect(() => {
    if (classData?.aiOutline && expandedChapters.size === 0) {
      // 默认展开前两个章节
      setExpandedChapters(new Set([0, 1]));
    }
  }, [classData?.aiOutline]);

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

  // 初始化章节内容
  useEffect(() => {
    if (classData?.aiOutline && Array.isArray(classData.aiOutline)) {
      const initialContents: { [key: number]: Chapter } = {};
      classData.aiOutline.forEach((chapter, index) => {
        initialContents[index] = { ...chapter };
      });
      setChapterContents(initialContents);
    }
  }, [classData?.aiOutline]);

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

  // 处理章节内容编辑
  const handleChapterEdit = (index: number, field: keyof Chapter, value: any) => {
    setChapterContents(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  // 保存章节修改
  const saveChapterEdit = async (index: number) => {
    if (!classData) return;
    
    try {
      const updatedOutline = [...(classData.aiOutline || [])];
      updatedOutline[index] = chapterContents[index];
      
      await api.put(`/api/classes/${classData._id}`, { 
        aiOutline: updatedOutline 
      });
      
      setClassData(prev => prev ? { ...prev, aiOutline: updatedOutline } : null);
      setEditingChapter(null);
    } catch (error: any) {
      console.error('保存章节失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`保存失败: ${errorMessage}`);
    }
  };

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
          <button onClick={() => navigate('/dashboard')} style={styles.actionButton}>
            返回
          </button>
        </div>
      </header>

      <div style={styles.mainLayout}>
        {/* 左侧主区域 - 块状笔记本 */}
        <div style={styles.notebookArea}>

          {/* 大纲视图 */}
          {viewMode === 'outline' ? (
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
            
              {classData.aiOutline && Array.isArray(classData.aiOutline) && classData.aiOutline.length > 0 ? (
                classData.aiOutline.map((chapter, index) => {
                  const isEditing = editingChapter === index;
                  const chapterContent = chapterContents[index] || chapter;
                  
                  return (
                    <div 
                      key={index} 
                      style={{
                        ...styles.chapterBlock,
                        boxShadow: expandedChapters.has(index) ? '0 2px 8px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div 
                        style={styles.chapterHeader}
                        onClick={() => !isEditing && toggleChapter(index)}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={chapterContent.title}
                            onChange={(e) => handleChapterEdit(index, 'title', e.target.value)}
                            style={styles.chapterTitleInput}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3 style={styles.chapterTitle}>{chapter.title}</h3>
                        )}
                        <div style={styles.chapterMeta}>
                          <span style={styles.chapterTime}>
                            {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isEditing) {
                                saveChapterEdit(index);
                              } else {
                                setEditingChapter(index);
                              }
                            }}
                            style={styles.editButton}
                          >
                            {isEditing ? '保存' : '编辑'}
                          </button>
                          {isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChapter(null);
                                setChapterContents(prev => ({
                                  ...prev,
                                  [index]: chapter
                                }));
                              }}
                              style={styles.cancelButton}
                            >
                              取消
                            </button>
                          )}
                          <span style={styles.expandIcon}>
                            {expandedChapters.has(index) ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>
                  
                      {expandedChapters.has(index) && (
                        <div style={styles.chapterContent}>
                          {/* 关键点 */}
                          <div style={styles.keyPointsSection}>
                            <h4 style={styles.sectionTitle}>关键要点</h4>
                            {isEditing ? (
                              <div style={styles.keyPointsEditor}>
                                {chapterContent.keyPoints.map((point, idx) => (
                                  <div key={idx} style={styles.keyPointItem}>
                                    <input
                                      type="text"
                                      value={point}
                                      onChange={(e) => {
                                        const newPoints = [...chapterContent.keyPoints];
                                        newPoints[idx] = e.target.value;
                                        handleChapterEdit(index, 'keyPoints', newPoints);
                                      }}
                                      style={styles.keyPointInput}
                                    />
                                    <button
                                      onClick={() => {
                                        const newPoints = chapterContent.keyPoints.filter((_, i) => i !== idx);
                                        handleChapterEdit(index, 'keyPoints', newPoints);
                                      }}
                                      style={styles.removeButton}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => {
                                    handleChapterEdit(index, 'keyPoints', [...chapterContent.keyPoints, '']);
                                  }}
                                  style={styles.addButton}
                                >
                                  + 添加要点
                                </button>
                              </div>
                            ) : (
                              <ul style={styles.keyPointsList}>
                                {chapter.keyPoints.map((point, idx) => (
                                  <li key={idx} style={styles.keyPointListItem}>{point}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                      
                          {/* 主要内容 */}
                          <div style={styles.contentSection}>
                            <h4 style={styles.sectionTitle}>详细内容</h4>
                            {isEditing ? (
                              <textarea
                                value={chapterContent.content}
                                onChange={(e) => handleChapterEdit(index, 'content', e.target.value)}
                                style={styles.contentTextarea}
                                rows={6}
                              />
                            ) : (
                              <p style={styles.contentText}>{chapter.content}</p>
                            )}
                          </div>
                      
                          {/* PPT/板书内容 */}
                          {(() => {
                            const relatedImages = getRelatedImages(chapter.relatedImages);
                            return relatedImages.length > 0 && (
                              <div style={styles.mediaSection}>
                                <h4 style={styles.sectionTitle}>PPT/板书内容</h4>
                                <div style={styles.mediaGrid}>
                                  {relatedImages.map(image => (
                                    <div key={image._id} style={styles.mediaCard}>
                                      <img 
                                        src={`http://localhost:3001${image.url}`} 
                                        alt="课堂图片"
                                        style={styles.mediaThumbnail}
                                      />
                                      <div style={styles.mediaContent}>
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
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                      
                          {/* 相关笔记 */}
                          {(() => {
                            const relatedNotes = getRelatedNotes(chapter.relatedNotes);
                            return relatedNotes.length > 0 && (
                              <div style={styles.notesSection}>
                                <h4 style={styles.sectionTitle}>课堂笔记</h4>
                                {relatedNotes.map(note => (
                                  <div key={note.eventId} style={styles.noteCard}>
                                    <span style={styles.noteTime}>{formatTime(note.timestamp)}</span>
                                    <p style={styles.noteContent}>{note.data.content}</p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })
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
          ) : (
            /* 完整转写视图 */
            <div style={styles.transcriptView}>
              <div style={styles.transcriptHeader}>
                <h2 style={styles.transcriptTitle}>完整转写文本</h2>
              </div>
              <div style={styles.transcriptContent}>
                <pre style={styles.transcriptText}>{fullTranscript}</pre>
              </div>
            </div>
          )}
          
          {/* 底部切换按钮 */}
          <div style={styles.viewSwitcher}>
            <button
              onClick={() => setViewMode(viewMode === 'outline' ? 'transcript' : 'outline')}
              style={styles.switchButton}
            >
              {viewMode === 'outline' ? '查看完整转写' : '返回大纲视图'}
            </button>
          </div>
        </div>

        {/* 右侧固定AI助手 */}
        <div style={styles.sidebarArea}>
          <QAChat classId={classData._id} />
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f6f7',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    backgroundColor: 'white',
    padding: '16px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e4e6eb'
  },
  meta: {
    color: '#65676b',
    marginTop: '4px',
    fontSize: '14px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#e4e6eb',
    color: '#050505',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  mainLayout: {
    display: 'flex',
    flex: 1,
    height: 'calc(100vh - 70px)',
    overflow: 'hidden'
  },
  notebookArea: {
    flex: 1,
    backgroundColor: '#f5f6f7',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  outlineView: {
    flex: 1,
    backgroundColor: 'white',
    margin: '20px',
    marginRight: '10px',
    borderRadius: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    overflow: 'auto',
    padding: '24px'
  },
  processingMessage: {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: '16px',
    color: '#65676b'
  },
  generateOutlineContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#f0f7ff',
    borderRadius: '12px',
    margin: '20px 0'
  },
  generateOutlineText: {
    fontSize: '16px',
    color: '#65676b',
    marginBottom: '20px'
  },
  generateOutlineButton: {
    padding: '12px 24px',
    backgroundColor: '#1877f2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  chapterBlock: {
    marginBottom: '16px',
    backgroundColor: 'white',
    border: '1px solid #e4e6eb',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  chapterHeader: {
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #e4e6eb',
    transition: 'background-color 0.2s'
  },
  chapterTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#050505'
  },
  chapterTitleInput: {
    fontSize: '18px',
    fontWeight: '600',
    padding: '4px 8px',
    border: '1px solid #1877f2',
    borderRadius: '4px',
    width: '100%',
    maxWidth: '500px'
  },
  chapterMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  chapterTime: {
    color: '#65676b',
    fontSize: '14px',
    fontWeight: '400'
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#e4e6eb',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  cancelButton: {
    padding: '6px 12px',
    backgroundColor: '#fff',
    border: '1px solid #e4e6eb',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  expandIcon: {
    fontSize: '12px',
    color: '#65676b',
    marginLeft: '8px'
  },
  chapterContent: {
    padding: '20px',
    backgroundColor: '#f8f9fa'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#050505'
  },
  keyPointsSection: {
    marginBottom: '24px'
  },
  keyPointsList: {
    margin: 0,
    paddingLeft: '20px',
    lineHeight: '1.8'
  },
  keyPointListItem: {
    marginBottom: '8px',
    color: '#050505'
  },
  keyPointsEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  keyPointItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  keyPointInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e4e6eb',
    borderRadius: '6px',
    fontSize: '14px'
  },
  removeButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#e4e6eb',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#e7f3ff',
    color: '#1877f2',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '8px'
  },
  contentSection: {
    marginBottom: '24px'
  },
  contentText: {
    lineHeight: '1.8',
    color: '#050505',
    margin: 0
  },
  contentTextarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e4e6eb',
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'vertical'
  },
  mediaSection: {
    marginBottom: '24px'
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  mediaCard: {
    backgroundColor: 'white',
    border: '1px solid #e4e6eb',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  mediaThumbnail: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderBottom: '1px solid #e4e6eb'
  },
  mediaContent: {
    padding: '12px'
  },
  ocrButton: {
    padding: '8px 16px',
    backgroundColor: '#42b883',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    width: '100%',
    transition: 'background-color 0.2s'
  },
  notesSection: {
    marginBottom: '24px'
  },
  noteCard: {
    padding: '12px 16px',
    backgroundColor: '#e7f3ff',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #d0e8ff'
  },
  noteTime: {
    fontSize: '12px',
    color: '#65676b',
    fontWeight: '500',
    display: 'block',
    marginBottom: '4px'
  },
  noteContent: {
    margin: 0,
    color: '#050505',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  timelineView: {
    padding: '24px'
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '16px',
    paddingLeft: '24px',
    borderLeft: '2px solid #e4e6eb',
    position: 'relative'
  },
  timelineTime: {
    minWidth: '80px',
    color: '#65676b',
    fontSize: '14px',
    fontWeight: '500'
  },
  timelineNote: {
    marginLeft: '20px',
    padding: '12px 16px',
    backgroundColor: '#e7f3ff',
    borderRadius: '8px',
    flex: 1,
    border: '1px solid #d0e8ff'
  },
  timelineImage: {
    marginLeft: '20px',
    padding: '12px 16px',
    backgroundColor: '#f0f2f5',
    borderRadius: '8px',
    flex: 1
  },
  timelineImageContainer: {
    marginLeft: '20px',
    flex: 1
  },
  timelineImagePreview: {
    marginTop: '12px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e4e6eb'
  },
  timelineThumbnail: {
    maxWidth: '240px',
    maxHeight: '180px',
    marginBottom: '12px',
    borderRadius: '6px',
    border: '1px solid #e4e6eb'
  },
  timelineOCR: {
    marginTop: '12px',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  transcriptView: {
    flex: 1,
    backgroundColor: 'white',
    margin: '20px',
    marginRight: '10px',
    borderRadius: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  transcriptHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e4e6eb'
  },
  transcriptTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#050505'
  },
  transcriptContent: {
    flex: 1,
    padding: '24px',
    overflow: 'auto'
  },
  transcriptText: {
    whiteSpace: 'pre-wrap',
    lineHeight: '1.8',
    fontSize: '15px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#050505',
    margin: 0
  },
  viewSwitcher: {
    padding: '20px',
    borderTop: '1px solid #e4e6eb',
    backgroundColor: 'white',
    textAlign: 'center'
  },
  switchButton: {
    padding: '12px 32px',
    backgroundColor: '#1877f2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  sidebarArea: {
    width: '400px',
    backgroundColor: '#ffffff',
    borderLeft: '1px solid #e4e6eb',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '20px'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#65676b'
  },
  error: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#e74c3c'
  }
};

export default StructuredClassView;