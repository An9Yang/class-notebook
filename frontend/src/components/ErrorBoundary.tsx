import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Reload the page to clear any corrupted state
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.errorCard}>
            <h1 style={styles.title}>应用程序出现错误</h1>
            <p style={styles.message}>
              抱歉，应用程序遇到了意外错误。我们已经记录了这个问题。
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>错误详情（开发模式）</summary>
                <pre style={styles.errorText}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <div style={styles.actions}>
              <button onClick={this.handleReset} style={styles.resetButton}>
                返回主页
              </button>
              <button 
                onClick={() => window.location.reload()} 
                style={styles.reloadButton}
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    padding: '20px'
  },
  errorCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center'
  },
  title: {
    color: '#dc3545',
    marginBottom: '20px'
  },
  message: {
    color: '#666',
    marginBottom: '30px',
    lineHeight: '1.6'
  },
  details: {
    marginTop: '20px',
    marginBottom: '20px',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '5px'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px'
  },
  errorText: {
    color: '#dc3545',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '200px',
    margin: '10px 0'
  },
  actions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center'
  },
  resetButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  reloadButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  }
};

export default ErrorBoundary;