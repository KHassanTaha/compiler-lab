import { createContext } from "react";
import type { User } from "../../lib/types";

export interface AuthContextValue {
  user: User | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
