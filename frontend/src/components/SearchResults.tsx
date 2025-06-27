import React from 'react';
import { useNavigate } from 'react-router-dom';
import HighlightText from './HighlightText';

interface SearchResult {
  _id: string;
  title: string;
  description: string;
  courseName: string;
  teacherName: string;
  createdAt: string;
  notes?: string;
  recordings?: Array<{
    _id: string;
    transcript: string;
  }>;
  images?: Array<{
    _id: string;
    ocrText: string;
  }>;
  _matchCount?: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  searchTerm: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, searchTerm }) => {
  const navigate = useNavigate();

  const getMatchContext = (text: string, term: string, contextLength: number = 100) => {
    if (!text || !term) return '';
    
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);
    
    if (index === -1) return text.substring(0, contextLength * 2) + '...';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + term.length + contextLength);
    
    let context = text.substring(start, end);
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context;
  };

  const handleClassClick = (classId: string) => {
    navigate(`/class/${classId}`);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>搜索结果 ({results.length})</h2>
      
      {results.map(result => (
        <div 
          key={result._id} 
          style={styles.resultCard}
          onClick={() => handleClassClick(result._id)}
        >
          <div style={styles.resultHeader}>
            <h3 style={styles.resultTitle}>
              <HighlightText text={result.title} highlight={searchTerm} />
            </h3>
            {result._matchCount && (
              <span style={styles.matchCount}>
                {result._matchCount} 个匹配
              </span>
            )}
          </div>
          
          <div style={styles.resultMeta}>
            {result.courseName && (
              <span>课程: <HighlightText text={result.courseName} highlight={searchTerm} /></span>
            )}
            {result.teacherName && (
              <span> | 教师: <HighlightText text={result.teacherName} highlight={searchTerm} /></span>
            )}
            <span> | {new Date(result.createdAt).toLocaleDateString()}</span>
          </div>
          
          {result.description && (
            <p style={styles.resultDescription}>
              <HighlightText text={result.description} highlight={searchTerm} />
            </p>
          )}
          
          {/* 显示匹配的上下文 */}
          <div style={styles.matchContexts}>
            {result.notes && result.notes.toLowerCase().includes(searchTerm.toLowerCase()) && (
              <div style={styles.context}>
                <span style={styles.contextLabel}>笔记:</span>
                <HighlightText 
                  text={getMatchContext(result.notes, searchTerm)} 
                  highlight={searchTerm} 
                />
              </div>
            )}
            
            {result.recordings?.map(recording => {
              if (recording.transcript?.toLowerCase().includes(searchTerm.toLowerCase())) {
                return (
                  <div key={recording._id} style={styles.context}>
                    <span style={styles.contextLabel}>录音转写:</span>
                    <HighlightText 
                      text={getMatchContext(recording.transcript, searchTerm)} 
                      highlight={searchTerm} 
                    />
                  </div>
                );
              }
              return null;
            })}
            
            {result.images?.map(image => {
              if (image.ocrText?.toLowerCase().includes(searchTerm.toLowerCase())) {
                return (
                  <div key={image._id} style={styles.context}>
                    <span style={styles.contextLabel}>图片OCR:</span>
                    <HighlightText 
                      text={getMatchContext(image.ocrText, searchTerm)} 
                      highlight={searchTerm} 
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginTop: '20px'
  },
  title: {
    marginBottom: '20px',
    color: '#333'
  },
  resultCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  resultTitle: {
    margin: 0,
    color: '#333',
    fontSize: '18px'
  },
  matchCount: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px'
  },
  resultMeta: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px'
  },
  resultDescription: {
    color: '#666',
    marginBottom: '10px'
  },
  matchContexts: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #eee'
  },
  context: {
    marginBottom: '10px',
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.6'
  },
  contextLabel: {
    fontWeight: 'bold',
    color: '#666',
    marginRight: '8px'
  }
};

export default SearchResults;