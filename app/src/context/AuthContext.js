import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const C = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('mg_tok');
    const u = localStorage.getItem('mg_usr');
    if (t && u) {
      try {
        setToken(t);
        setUser(JSON.parse(u));
      } catch {
        localStorage.removeItem('mg_tok');
        localStorage.removeItem('mg_usr');
      }
    }
    setReady(true);
  }, []);

  const login = (t, u) => {
    setToken(t);
    setUser(u);
    localStorage.setItem('mg_tok', t);
    localStorage.setItem('mg_usr', JSON.stringify(u));
  };

  const logout = async () => {
    const t = localStorage.getItem('mg_tok');
    if (t) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + t }
        });
      } catch {}
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('mg_tok');
    localStorage.removeItem('mg_usr');
  };

  const updateUser = u => {
    setUser(u);
    localStorage.setItem('mg_usr', JSON.stringify(u));
  };

  // FIX: always read token from localStorage so it's available even on refresh
  const api = useCallback(async (p, o = {}) => {
    const tok = localStorage.getItem('mg_tok');
    const r = await fetch('/api' + p, {
      ...o,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + tok,
        ...o.headers,
      },
      body: o.body ? JSON.stringify(o.body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  }, []);

  return (
    <C.Provider value={{ user, token, ready, login, logout, updateUser, api }}>
      {children}
    </C.Provider>
  );
}

export const useAuth = () => useContext(C);
