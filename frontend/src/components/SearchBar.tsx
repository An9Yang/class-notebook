import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { extractResponseData, extractErrorMessage } from '../utils/responseHandler';
import debounce from 'lodash.debounce';

interface SearchResult {
  _id: string;
  title: string;
  description: string;
  courseName: string;
  teacherName: string;
  createdAt: string;
  recordings?: any[];
  images?: any[];
  _matchCount?: number;
}

interface SearchBarProps {
  onSearch?: (results: SearchResult[]) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = '搜索课堂、笔记、录音内容...' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    courseName: '',
    teacherName: '',
    startDate: '',
    endDate: ''
  });
  const navigate = useNavigate();

  // 创建防抖搜索函数
  const debouncedSearch = useCallback(
    debounce(async (term: string, currentFilters: typeof filters) => {
      if (!term && !Object.values(currentFilters).some(v => v)) {
        if (onSearch) onSearch([]);
        return;
      }

      setIsSearching(true);
      try {
        const params: any = {};
        if (term) params.q = term;
        if (currentFilters.courseName) params.courseName = currentFilters.courseName;
        if (currentFilters.teacherName) params.teacherName = currentFilters.teacherName;
        if (currentFilters.startDate) params.startDate = currentFilters.startDate;
        if (currentFilters.endDate) params.endDate = currentFilters.endDate;

        const response = await api.get('/api/classes/search', { params });
        const data = extractResponseData(response, 'search');
        
        if (onSearch) {
          onSearch(data.classes || []);
        }
      } catch (error: any) {
        console.error('搜索失败:', error);
        alert(`搜索失败: ${extractErrorMessage(error)}`);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [onSearch]
  );

  // 搜索词变化时触发搜索
  useEffect(() => {
    debouncedSearch(searchTerm, filters);
  }, [searchTerm, filters, debouncedSearch]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      courseName: '',
      teacherName: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.searchBox}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          style={styles.searchInput}
        />
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={styles.advancedButton}
          title="高级搜索"
        >
          ⚙️
        </button>
        {isSearching && <span style={styles.loading}>搜索中...</span>}
      </div>

      {showAdvanced && (
        <div style={styles.advancedFilters}>
          <div style={styles.filterRow}>
            <input
              type="text"
              placeholder="课程名称"
              value={filters.courseName}
              onChange={(e) => handleFilterChange('courseName', e.target.value)}
              style={styles.filterInput}
            />
            <input
              type="text"
              placeholder="教师姓名"
              value={filters.teacherName}
              onChange={(e) => handleFilterChange('teacherName', e.target.value)}
              style={styles.filterInput}
            />
          </div>
          <div style={styles.filterRow}>
            <input
              type="date"
              placeholder="开始日期"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={styles.filterInput}
            />
            <input
              type="date"
              placeholder="结束日期"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={styles.filterInput}
            />
            <button onClick={clearFilters} style={styles.clearButton}>
              清除筛选
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginBottom: '20px'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    position: 'relative'
  },
  searchInput: {
    flex: '1',
    padding: '12px 20px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '25px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  advancedButton: {
    padding: '10px 15px',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'background-color 0.2s'
  },
  loading: {
    position: 'absolute',
    right: '80px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#666',
    fontSize: '14px'
  },
  advancedFilters: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  filterRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px'
  },
  filterInput: {
    flex: '1',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px'
  },
  clearButton: {
    padding: '8px 16px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap'
  }
};

export default SearchBar;