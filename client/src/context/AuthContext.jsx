
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

function readSavedUser() {
  try {
    const saved = localStorage.getItem('cf_user');
    return saved && saved !== 'undefined'
      ? JSON.parse(saved)
      : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = localStorage.getItem('cf_token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');

        if (!cancelled) {
          setUser(data.user);
          localStorage.setItem(
            'cf_user',
            JSON.stringify(data.user)
          );
        }
      } catch (error) {
        // Do not erase saved credentials on network/server errors.
        // A definitive 401 means the token is not accepted.
        if (!cancelled && error.response?.status === 401) {
          localStorage.removeItem('cf_token');
          localStorage.removeItem('cf_user');
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const googleLogin = async (googleToken) => {
    const { data } = await api.post('/auth/google', {
      token: googleToken,
    });

    localStorage.setItem('cf_token', data.token);
    localStorage.setItem('cf_user', JSON.stringify(data.user));
    setUser(data.user);

    return data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_user');
    setUser(null);
  }, []);

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');

    setUser(data.user);
    localStorage.setItem('cf_user', JSON.stringify(data.user));

    return data.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        googleLogin,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
