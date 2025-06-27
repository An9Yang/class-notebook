import React from 'react';
import '../styles/RichTextEditor.css';

interface RichTextViewerProps {
  content: string;
  style?: React.CSSProperties;
}

const RichTextViewer: React.FC<RichTextViewerProps> = ({ content, style }) => {
  // 如果内容看起来像HTML，直接渲染；否则当作纯文本
  const isHTML = content && (content.includes('<p>') || content.includes('<h') || content.includes('<ul>') || content.includes('<ol>'));
  
  if (!content) {
    return <div style={{ color: '#999', fontStyle: 'italic', ...style }}>暂无内容</div>;
  }

  if (isHTML) {
    return (
      <div 
        className="ProseMirror"
        style={{ ...styles.viewer, ...style }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // 纯文本内容，转换为简单的HTML
  const htmlContent = content.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
  
  return (
    <div 
      className="ProseMirror"
      style={{ ...styles.viewer, ...style }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  viewer: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#333',
  }
};

export default RichTextViewer;