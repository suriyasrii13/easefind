import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { registerUser } from "../services/api";

interface User {
  userId: number;   
  email: string;
  name?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading:boolean;
  login: (userData: User, token: string) => void;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  const login = (userData: User, token: string) => {
    // ✅ userData must contain userId
    setUser(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const register = async (name: string, email: string, password: string) => {
    await registerUser({ name, email, password });
    // No longer auto-logging in here to follow professional flow
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user,loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}