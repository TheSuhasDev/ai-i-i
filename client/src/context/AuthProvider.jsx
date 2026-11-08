import { useState } from "react";
import { AuthContext } from "./authContext";
import { authService } from "../services";

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  const login = async (email, password) => {
    const { data } = await authService.login(email, password);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  const updateUser = (updated) => {
    const next = { ...user, ...updated };
    localStorage.setItem("user", JSON.stringify(next));
    setUser(next);
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    canWrite: ["admin", "manager"].includes(user?.role),
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}