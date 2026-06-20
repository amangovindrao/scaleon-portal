import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { role: 'admin'|'candidate', token }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      // Verify token is still valid by checking expiry
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp > now) {
          setUser({ token, role });
        } else {
          // Token expired — clear it
          localStorage.clear();
        }
      } catch {
        // Malformed token — clear it
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  async function loginAdmin(email, password) {
    const { data } = await api.post('/auth/admin/login', { email, password });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', 'admin');
    setUser({ token: data.access_token, role: 'admin' });
  }

  async function loginCandidate(email, access_code) {
    const { data } = await api.post('/auth/candidate/login', { email, access_code });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', 'candidate');
    setUser({ token: data.access_token, role: 'candidate' });
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginAdmin, loginCandidate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
