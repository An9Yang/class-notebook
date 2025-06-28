import React, { useState } from 'react';

const BlockEditorTips: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={styles.toggleButton}
        title="编辑器使用技巧"
      >
        💡
      </button>
      
      {isOpen && (
        <div style={styles.modal} onClick={() => setIsOpen(false)}>
          <div style={styles.content} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.title}>块编辑器使用技巧</h3>
            
            <div style={styles.section}>
              <h4>基本操作</h4>
              <ul style={styles.list}>
                <li>输入 <code>/</code> 打开命令菜单</li>
                <li>点击左侧 <code>+</code> 按钮添加新块</li>
                <li>拖拽 <code>⋮⋮</code> 图标重新排序块</li>
                <li>按 <code>Enter</code> 创建新段落</li>
                <li>按 <code>Backspace</code> 在空行删除块</li>
              </ul>
            </div>
            
            <div style={styles.section}>
              <h4>快捷命令</h4>
              <ul style={styles.list}>
                <li><code>/h1</code>, <code>/h2</code>, <code>/h3</code> - 创建标题</li>
                <li><code>/bullet</code> - 创建无序列表</li>
                <li><code>/number</code> - 创建有序列表</li>
                <li><code>/code</code> - 创建代码块</li>
                <li><code>/todo</code> - 创建待办事项</li>
                <li><code>/quote</code> - 创建引用块</li>
              </ul>
            </div>
            
            <div style={styles.section}>
              <h4>文本格式</h4>
              <ul style={styles.list}>
                <li>选中文本显示格式工具栏</li>
                <li><code>Ctrl/Cmd + B</code> - 粗体</li>
                <li><code>Ctrl/Cmd + I</code> - 斜体</li>
                <li><code>Ctrl/Cmd + U</code> - 下划线</li>
                <li><code>Ctrl/Cmd + K</code> - 插入链接</li>
              </ul>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              style={styles.closeButton}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  toggleButton: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#4a90e2',
    color: 'white',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    zIndex: 1000,
    transition: 'transform 0.2s',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '24px',
    color: '#333',
  },
  section: {
    marginBottom: '20px',
  },
  list: {
    margin: '10px 0',
    paddingLeft: '20px',
    lineHeight: '1.8',
  },
  closeButton: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#4a90e2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '100%',
  },
};

export default BlockEditorTips;