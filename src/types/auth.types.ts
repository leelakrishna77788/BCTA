import { UserRole } from "./member.types";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface AuthContextValue {
  currentUser: AuthUser | null;
  userProfile: import("./member.types").Member | null;
  userRole: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<import("firebase/auth").UserCredential>;
  logout: () => Promise<void>;
  createMember: (
    email: string,
    password: string,
    memberData: Partial<import("./member.types").Member>
  ) => Promise<import("firebase/auth").UserCredential>;
  registerUser: (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ) => Promise<import("firebase/auth").UserCredential>;
  register: (email: string, password: string) => Promise<import("firebase/auth").UserCredential>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void> | void;
}
