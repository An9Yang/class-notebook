import React from 'react';

interface OCRDisplayProps {
  text: string;
  tables?: string[][][];
}

const OCRDisplay: React.FC<OCRDisplayProps> = ({ text, tables }) => {
  // 如果有表格数据，优先显示表格
  if (tables && tables.length > 0) {
    return (
      <div style={styles.container}>
        {tables.map((table, tableIndex) => (
          <div key={tableIndex} style={styles.tableWrapper}>
            <table style={styles.table}>
              <tbody>
                {table.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex}>
                    {row.map((cell: string, cellIndex: number) => (
                      <td key={cellIndex} style={styles.cell}>
                        {cell || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {/* 如果除了表格还有其他文本，也显示出来 */}
        {text && (
          <div style={styles.additionalText}>
            <p style={styles.textLabel}>其他文本：</p>
            <pre style={styles.text}>{text}</pre>
          </div>
        )}
      </div>
    );
  }

  // 没有表格数据，显示纯文本
  return (
    <div style={styles.container}>
      <pre style={styles.text}>{text}</pre>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginTop: '10px',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginBottom: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  cell: {
    border: '1px solid #ddd',
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  additionalText: {
    marginTop: '15px',
  },
  textLabel: {
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#666',
  },
  text: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.8',
    fontFamily: 'monospace',
    fontSize: '14px',
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
    margin: 0,
  },
};

export default OCRDisplay;