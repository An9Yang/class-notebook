import React from 'react';

interface HighlightTextProps {
  text: string;
  highlight: string;
  style?: React.CSSProperties;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, highlight, style }) => {
  if (!highlight || !text) {
    return <span style={style}>{text}</span>;
  }

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  
  return (
    <span style={style}>
      {parts.map((part, index) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={index} style={highlightStyle}>{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

const highlightStyle: React.CSSProperties = {
  backgroundColor: '#ffeb3b',
  padding: '2px 0',
  borderRadius: '2px'
};

export default HighlightText;