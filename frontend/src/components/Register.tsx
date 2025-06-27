import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证密码匹配
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    // 验证密码长度
    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    setLoading(true);

    try {
      await register(email, name, password, role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h2 style={styles.title}>注册新账号</h2>
        
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="student@example.com"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>用户名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              style={styles.input}
              placeholder="张三"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
              placeholder="至少6位"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="再次输入密码"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>角色</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={styles.input}
            >
              <option value="student">学生</option>
              <option value="teacher">教师</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p style={styles.linkText}>
          已有账号？ <Link to="/login" style={styles.link}>立即登录</Link>
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    padding: '20px'
  },
  formCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center',
    marginBottom: '30px',
    color: '#333'
  },
  form: {
    display: 'flex',
    flexDirection: 'column'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#666'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  button: {
    padding: '12px',
    backgroundColor: '#61dafb',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '10px',
    transition: 'background-color 0.3s'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
  },
  linkText: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666'
  },
  link: {
    color: '#61dafb',
    textDecoration: 'none'
  }
};

export default Register;