import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  favorites: string[];
  role: 'user' | 'admin';
  approved: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  updateFavorites: (favorites: string[]) => Promise<void>;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // Load user from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      const error: any = new Error(data.message || 'Giriş başarısız');
      if (data.pending) {
        error.pending = true;
      }
      throw error;
    }

    setToken(data.data.token);
    setUser(data.data.user);
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
  };

  const register = async (email: string, password: string, username: string) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Kayıt başarısız');
    }

    setToken(data.data.token);
    setUser(data.data.user);
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateFavorites = async (favorites: string[]): Promise<void> => {
    if (!token) {
      throw new Error('Oturum açmanız gerekiyor');
    }

    try {
      const response = await fetch(`${API_URL}/auth/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ favorites }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Favoriler güncellenemedi');
      }

      if (data.data?.user) {
        setUser(data.data.user);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
    } catch (error: any) {
      // Network hatası veya API hatası
      console.error('Favori güncelleme hatası:', error);
      throw new Error(error.message || 'Favoriler güncellenirken bir hata oluştu');
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, updateFavorites, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
