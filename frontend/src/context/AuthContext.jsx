import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

// localStorage — persists across tabs and browser restarts until logout or token expiry (7 days)
const storage = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => localStorage.removeItem(key),
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storage.get("gng_user"));
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem("gng_token") || null; } catch { return null; }
  });

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    storage.set("gng_user", userData);
    localStorage.setItem("gng_token", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("gng_user");
    localStorage.removeItem("gng_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
