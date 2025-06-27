import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { extractResponseData, extractErrorMessage } from '../utils/responseHandler';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface QAChatProps {
  classId: string;
  className?: string;
}

const QAChat: React.FC<QAChatProps> = ({ classId, className }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 添加欢迎消息
    setMessages([{
      id: '1',
      type: 'assistant',
      content: '你好！我是你的学习助手。我可以根据这节课的内容回答你的问题。有什么想了解的吗？',
      timestamp: new Date()
    }]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.post(`/api/qa/ask/${classId}`, {
        question: inputValue
      });
      
      const data = extractResponseData(response);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(data.timestamp)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      
      // 检查是否是AI服务未配置
      if (errorMessage.includes('AI服务未配置')) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'system',
          content: '⚠️ AI服务尚未配置。请在.env文件中添加Azure OpenAI的配置信息。',
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'system',
          content: `抱歉，处理您的问题时出现错误：${errorMessage}`,
          timestamp: new Date()
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    setIsLoading(true);
    
    try {
      const response = await api.get(`/api/qa/summary/${classId}`);
      const data = extractResponseData(response);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `📝 **课堂总结**\n\n${data.summary}`,
        timestamp: new Date(data.timestamp)
      }]);
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        content: `生成总结失败：${errorMessage}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuiz = async () => {
    setIsLoading(true);
    
    try {
      const response = await api.get(`/api/qa/quiz/${classId}`);
      const data = extractResponseData(response);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `📚 **复习问题**\n\n${data.questions}`,
        timestamp: new Date(data.timestamp)
      }]);
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        content: `生成复习问题失败：${errorMessage}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <div style={styles.minimized} onClick={() => setIsMinimized(false)}>
        <span style={styles.minimizedIcon}>💬</span>
        <span>学习助手</span>
      </div>
    );
  }

  return (
    <div style={styles.container} className={className}>
      <div style={styles.header}>
        <h3 style={styles.title}>🤖 学习助手</h3>
        <button 
          onClick={() => setIsMinimized(true)}
          style={styles.minimizeButton}
        >
          －
        </button>
      </div>

      <div style={styles.quickActions}>
        <button 
          onClick={generateSummary} 
          disabled={isLoading}
          style={styles.actionButton}
        >
          生成总结
        </button>
        <button 
          onClick={generateQuiz} 
          disabled={isLoading}
          style={styles.actionButton}
        >
          复习问题
        </button>
      </div>

      <div style={styles.messagesContainer}>
        {messages.map(message => (
          <div
            key={message.id}
            style={{
              ...styles.message,
              ...(message.type === 'user' ? styles.userMessage : {}),
              ...(message.type === 'system' ? styles.systemMessage : {})
            }}
          >
            <div style={styles.messageContent}>
              {message.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < message.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
            <div style={styles.messageTime}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={styles.loadingMessage}>
            <div>
              <span style={{ ...styles.loadingDot, animationDelay: '0s' }}>●</span>
              <span style={{ ...styles.loadingDot, animationDelay: '0.2s' }}>●</span>
              <span style={{ ...styles.loadingDot, animationDelay: '0.4s' }}>●</span>
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.7 }}>
              正在思考中，o3模型可能需要较长时间...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={styles.inputForm}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入你的问题..."
          disabled={isLoading}
          style={styles.input}
        />
        <button 
          type="submit" 
          disabled={!inputValue.trim() || isLoading}
          style={styles.sendButton}
        >
          发送
        </button>
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '400px',
    height: '600px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    padding: '15px 20px',
    backgroundColor: '#61dafb',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '18px'
  },
  minimizeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 5px'
  },
  quickActions: {
    padding: '10px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    gap: '10px'
  },
  actionButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: '#f8f9fa'
  },
  message: {
    marginBottom: '15px',
    padding: '12px 16px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    maxWidth: '85%'
  },
  userMessage: {
    marginLeft: 'auto',
    backgroundColor: '#61dafb',
    color: 'white'
  },
  systemMessage: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    textAlign: 'center',
    maxWidth: '100%'
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap'
  },
  messageTime: {
    fontSize: '12px',
    opacity: 0.7,
    marginTop: '5px'
  },
  loadingMessage: {
    textAlign: 'center',
    padding: '10px',
    color: '#666'
  },
  loadingDot: {
    animation: 'blink 1.4s infinite',
    marginRight: '3px',
    display: 'inline-block'
  },
  inputForm: {
    padding: '15px',
    borderTop: '1px solid #eee',
    display: 'flex',
    gap: '10px'
  },
  input: {
    flex: 1,
    padding: '10px 15px',
    border: '1px solid #ddd',
    borderRadius: '20px',
    fontSize: '14px',
    outline: 'none'
  },
  sendButton: {
    padding: '10px 20px',
    backgroundColor: '#61dafb',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  },
  minimized: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '15px 20px',
    backgroundColor: '#61dafb',
    color: 'white',
    borderRadius: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'transform 0.2s'
  },
  minimizedIcon: {
    fontSize: '20px'
  }
};

export default QAChat;