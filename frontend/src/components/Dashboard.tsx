import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractResponseData, extractErrorMessage } from '../utils/responseHandler';
import SearchBar from './SearchBar';

interface Class {
  _id: string;
  title: string;
  description: string;
  courseName: string;
  teacherName: string;
  createdAt: string;
  recordings?: any[];
  images?: any[];
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Class[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      console.log('API响应:', response);
      
      // 使用工具函数处理响应
      const classesData = extractResponseData(response, 'classes') || [];
      setClasses(classesData);
    } catch (error: any) {
      console.error('加载课堂列表失败:', error);
      const errorMessage = extractErrorMessage(error);
      alert(`加载课堂列表失败: ${errorMessage}`);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNewClass = () => {
    navigate('/class/new');
  };

  const handleClassClick = (classId: string) => {
    navigate(`/class/${classId}`);
  };

  const handleDeleteClass = async (e: React.MouseEvent, classId: string) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
    
    if (!window.confirm('确定要删除这个课堂吗？所有录音和图片都会被删除，此操作不可恢复。')) {
      return;
    }
    
    try {
      await api.delete(`/api/classes/${classId}`);
      alert('课堂删除成功');
      await loadClasses(); // 重新加载列表
    } catch (error) {
      console.error('删除课堂失败:', error);
      alert(`删除失败: ${extractErrorMessage(error)}`);
    }
  };

  const handleSearchResults = (results: Class[]) => {
    setSearchResults(results.length > 0 ? results : null);
    setIsSearching(results.length > 0);
  };

  // 决定显示哪些课堂
  const displayClasses = searchResults !== null ? searchResults : classes;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>课堂笔记系统</h1>
        <div style={styles.userInfo}>
          <span style={styles.userName}>欢迎，{user?.name}</span>
          <span style={styles.userRole}>({user?.role === 'teacher' ? '教师' : '学生'})</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            退出登录
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.welcomeSection}>
          <h2>开始你的学习之旅</h2>
          <p>点击下方按钮创建新的课堂笔记</p>
        </div>

        {/* 搜索栏 */}
        <SearchBar onSearch={handleSearchResults} />

        <div style={styles.actionSection}>
          <button onClick={handleNewClass} style={styles.primaryButton}>
            <span style={styles.buttonIcon}>🎙️</span>
            <span>开始新的课堂</span>
          </button>
        </div>

        {/* 课堂列表 */}
        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : displayClasses.length > 0 ? (
          <div style={styles.classesSection}>
            <h2 style={styles.sectionTitle}>
              {isSearching ? `搜索结果 (${displayClasses.length})` : '我的课堂'}
            </h2>
            <div style={styles.classesGrid}>
              {displayClasses.map(classItem => (
                <div 
                  key={classItem._id} 
                  style={styles.classCard}
                  onClick={() => handleClassClick(classItem._id)}
                >
                  <button
                    style={styles.deleteButton}
                    onClick={(e) => handleDeleteClass(e, classItem._id)}
                    title="删除课堂"
                  >
                    🗑️
                  </button>
                  <h3 style={styles.classTitle}>{classItem.title}</h3>
                  {classItem.courseName && (
                    <p style={styles.classMeta}>课程：{classItem.courseName}</p>
                  )}
                  {classItem.teacherName && (
                    <p style={styles.classMeta}>教师：{classItem.teacherName}</p>
                  )}
                  <p style={styles.classMeta}>
                    创建时间：{new Date(classItem.createdAt).toLocaleDateString()}
                  </p>
                  <div style={styles.classStats}>
                    <span>🎙️ {classItem.recordings?.length || 0} 个录音</span>
                    <span>📸 {classItem.images?.length || 0} 张图片</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isSearching ? (
          <div style={styles.noResults}>
            <h3>没有找到匹配的结果</h3>
            <p>试试其他搜索词或调整筛选条件</p>
          </div>
        ) : (
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <h3>🎙️ 录音转文字</h3>
              <p>自动将课堂录音转换为可搜索的文字</p>
            </div>
            <div style={styles.featureCard}>
              <h3>📸 拍照识别</h3>
              <p>拍摄板书和PPT，自动提取文字内容</p>
            </div>
            <div style={styles.featureCard}>
              <h3>🤖 智能问答</h3>
              <p>基于笔记内容的AI问答助手</p>
            </div>
            <div style={styles.featureCard}>
              <h3>📝 笔记编辑</h3>
              <p>整合所有内容的富文本编辑器</p>
            </div>
          </div>
        )}
      </main>
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
  title: {
    margin: 0,
    color: '#333'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  userName: {
    fontWeight: 'bold',
    color: '#333'
  },
  userRole: {
    color: '#666',
    fontSize: '14px'
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  main: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  welcomeSection: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  actionSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '60px'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 40px',
    backgroundColor: '#61dafb',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s'
  },
  buttonIcon: {
    fontSize: '30px'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  featureCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  classesSection: {
    marginTop: '40px'
  },
  sectionTitle: {
    marginBottom: '20px',
    color: '#333'
  },
  classesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  classCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    position: 'relative'
  },
  deleteButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    padding: '8px 12px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.2s',
    zIndex: 1
  },
  classTitle: {
    marginTop: 0,
    marginBottom: '10px',
    color: '#333'
  },
  classMeta: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0'
  },
  classStats: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-around',
    fontSize: '14px',
    color: '#666'
  },
  noResults: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666'
  }
};

export default Dashboard;