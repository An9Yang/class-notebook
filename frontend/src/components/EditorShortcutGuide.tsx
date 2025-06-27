import React, { useState } from 'react';

const EditorShortcutGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { keys: 'Ctrl/⌘ + B', description: '加粗' },
    { keys: 'Ctrl/⌘ + I', description: '斜体' },
    { keys: 'Ctrl/⌘ + U', description: '下划线' },
    { keys: 'Ctrl/⌘ + Shift + S', description: '删除线' },
    { keys: 'Ctrl/⌘ + Shift + H', description: '高亮' },
    { keys: 'Ctrl/⌘ + K', description: '插入链接' },
    { keys: 'Ctrl/⌘ + Z', description: '撤销' },
    { keys: 'Ctrl/⌘ + Y', description: '重做' },
    { keys: 'Ctrl/⌘ + Enter', description: '保存' },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.toggleButton}
        title="快捷键指南"
      >
        ⌨️
      </button>
      
      {isOpen && (
        <div style={styles.guide}>
          <h4 style={styles.title}>快捷键指南</h4>
          <div style={styles.shortcuts}>
            {shortcuts.map((shortcut, index) => (
              <div key={index} style={styles.shortcut}>
                <span style={styles.keys}>{shortcut.keys}</span>
                <span style={styles.description}>{shortcut.description}</span>
              </div>
            ))}
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
    padding: '10px',
    borderRadius: '50%',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    cursor: 'pointer',
    fontSize: '20px',
    zIndex: 100,
  },
  guide: {
    position: 'fixed',
    bottom: '70px',
    left: '20px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 100,
    minWidth: '250px',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  shortcuts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  shortcut: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 0',
  },
  keys: {
    backgroundColor: '#f0f0f0',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  description: {
    fontSize: '14px',
    color: '#666',
  },
};

export default EditorShortcutGuide;