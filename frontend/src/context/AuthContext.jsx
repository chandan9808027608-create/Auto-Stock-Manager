import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

// sessionStorage — cleared when browser tab closes, safer than localStorage
const storage = {
  get: (key) => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } },
  set: (key, val) => sessionStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => sessionStorage.removeItem(key),
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storage.get("gng_user"));
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem("gng_token") || null; } catch { return null; }
  });

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    storage.set("gng_user", userData);
    sessionStorage.setItem("gng_token", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("gng_user");
    sessionStorage.removeItem("gng_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
