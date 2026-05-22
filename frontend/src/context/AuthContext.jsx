import { createContext, useContext, useState, useCallback } from "react";

export const ROLES = Object.freeze({ ADMIN: 0, USER: 1 });

const STORAGE_KEY   = "socilis_auth";
const TOKEN_KEY     = "access_token";

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(user, token) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    // access_token séparé pour que client.js puisse le lire via authHeaders()
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch { /* noop */ }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("role");
  } catch { /* noop */ }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession());

const login = useCallback((dataFromBackend) => {
  const { access_token, role, email } = dataFromBackend;
  const user = {
    email:  email ?? "",
    role:   role === "superadmin" ? ROLES.ADMIN : ROLES.USER,
    name:   email ? email.split("@")[0] : "SOC Analyste",
  };
  setUser(user);
  saveSession(user, access_token);
}, []);

  const logout = useCallback(() => {
    setUser(null);
    clearSession();
  }, []);

  const value = {
    user,
    role:            user?.role ?? null,
    isAuthenticated: user !== null,
    isAdmin:         user?.role === ROLES.ADMIN,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}