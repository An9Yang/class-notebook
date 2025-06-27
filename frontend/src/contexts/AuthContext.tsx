import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, role: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 从localStorage加载token
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
      // 设置axios默认header
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      // 获取用户信息
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      
      // 处理不同的响应格式
      let userData;
      if ((response as any).user) {
        userData = (response as any).user;
      } else if ((response as any).data && (response as any).data.user) {
        userData = (response as any).data.user;
      } else if ((response as any).id || (response as any)._id) {
        userData = response;
      } else {
        console.error('未知的用户数据格式:', response);
        throw new Error('无法解析用户数据');
      }
      
      setUser(userData);
    } catch (error: any) {
      console.error('获取用户信息失败:', error);
      // 如果token无效，清除它
      localStorage.removeItem('authToken');
      setToken(null);
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      
      // 处理不同的响应格式
      let user, token;
      if ((response as any).user && (response as any).token) {
        ({ user, token } = response as any);
      } else if ((response as any).data && (response as any).data.user && (response as any).data.token) {
        ({ user, token } = (response as any).data);
      } else {
        console.error('未知的登录响应格式:', response);
        throw new Error('登录响应格式错误');
      }
      
      setUser(user);
      setToken(token);
      localStorage.setItem('authToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error: any) {
      console.error('登录失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '登录失败';
      throw new Error(errorMessage);
    }
  };

  const register = async (email: string, name: string, password: string, role: string) => {
    try {
      const response = await api.post('/api/auth/register', { email, name, password, role });
      
      // 处理不同的响应格式
      let user, token;
      if ((response as any).user && (response as any).token) {
        ({ user, token } = response as any);
      } else if ((response as any).data && (response as any).data.user && (response as any).data.token) {
        ({ user, token } = (response as any).data);
      } else {
        console.error('未知的注册响应格式:', response);
        throw new Error('注册响应格式错误');
      }
      
      setUser(user);
      setToken(token);
      localStorage.setItem('authToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error: any) {
      console.error('注册失败:', error);
      const errorMessage = error.response?.data?.message || error.message || '注册失败';
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};