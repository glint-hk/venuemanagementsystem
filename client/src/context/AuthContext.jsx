// Auth context — provides user state and auth methods to the entire app.
// Team 2 (Prodnova) owned.
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getStoredUser,
  login as apiLogin,
  loginWithGoogle as apiLoginWithGoogle,
  logout as apiLogout,
} from "../lib/apiClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to load user from existing token
useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const login = useCallback(async (email, name) => {
    const data = await apiLogin(email, name);
    setUser(data.user);
    return data;
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    const data = await apiLoginWithGoogle(idToken);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
 