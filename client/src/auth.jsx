import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

// Gives every page access to the logged-in user:
//   const { user, login, signup, logout } = useAuth();
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true); // true while we check a saved token

  // On app load, if a token is saved, ask the server who it belongs to
  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null)) // expired or invalid token
      .finally(() => setChecking(false));
  }, []);

  async function login(email, password) {
    const { token, user } = await api.login(email, password);
    setToken(token);
    setUser(user);
    return user;
  }

  async function signup(displayName, email, password) {
    const { token, user } = await api.register(displayName, email, password);
    setToken(token);
    setUser(user);
    return user;
  }

  async function logout() {
    await api.logout().catch(() => {}); // still log out locally if the server is unreachable
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
