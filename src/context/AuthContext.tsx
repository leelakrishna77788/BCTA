import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser,
  type UserCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import type { AuthContextValue } from "../types/auth.types";
import type { Member, UserRole } from "../types/member.types";

const AuthContext = createContext<AuthContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AuthContextValue["currentUser"]>(null);
  const [userProfile, setUserProfile] = useState<Member | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (uid: string): Promise<Member | null> => {
    try {
      const docRef = doc(db, "users", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Member;
        
        // Calculate dynamic payment status based on current month
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        try {
            const paymentSnap = await getDocs(query(collection(db, "payments"), where("memberUID", "==", uid), where("month", "==", currentMonth), where("year", "==", currentYear)));
            data.paymentStatus = !paymentSnap.empty ? "paid" : "unpaid";
        } catch(paymentErr) {
            console.error("Error fetching payment status in AuthContext:", paymentErr);
            data.paymentStatus = "unpaid";
        }

        setUserProfile(data);
        const role = (data.role?.toLowerCase().trim() as UserRole) || "member";
        setUserRole(role);
        return { ...data, role };
      }
      return null;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
        const profile = await fetchUserProfile(user.uid);
        if (!profile) {
          console.warn(`[AuthProvider] No Firestore profile found for authenticated user: ${user.uid}`);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<UserCredential> => {
    const trimmedEmail = email.trim();
    const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    
    const profile = await fetchUserProfile(cred.user.uid);
    if (!profile) {
      throw new Error(`Account setup is incomplete (UID: ${cred.user.uid}). This usually happens if the system was interrupted. Please contact an admin to delete and re-add this account.`);
    }

    if (profile.status === "blocked") {
      await signOut(auth);
      throw new Error("Your account is blocked. Contact admin.");
    }
    if (profile.status === "pending") {
      await signOut(auth);
      throw new Error("Your account is pending approval. Contact admin.");
    }
    return cred;
  };

  const logout = () => signOut(auth);

  const createMember = async (
    email: string,
    password: string,
    memberData: Partial<Member>
  ): Promise<UserCredential> => {
    const trimmedEmail = email.trim();
    const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    
    try {
      await setDoc(doc(db, "users", cred.user.uid), {
        ...memberData,
        uid: cred.user.uid,
        role: "member",
        status: "active",
        attendanceCount: 0,
        paymentStatus: "unpaid",
        createdAt: serverTimestamp(),
      });
      return cred;
    } catch (err) {
      console.error("[AuthContext] Firestore setup failed, rolling back Auth user:", err);
      try {
        await deleteUser(cred.user);
      } catch (rollbackErr) {
        console.error("[AuthContext] CRITICAL: Rollback failed:", rollbackErr);
      }
      throw err;
    }
  };

  const registerUser = async (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ): Promise<UserCredential> => {
    const trimmedEmail = email.trim();
    const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    
    try {
      const userData: Partial<Member> = {
        uid: cred.user.uid,
        name,
        email: trimmedEmail,
        role,
        status: "active",
        ...(role === "member" && {
          memberId: `BCTA-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
          attendanceCount: 0,
          paymentStatus: "unpaid",
        }),
      };
      await setDoc(doc(db, "users", cred.user.uid), {
        ...userData,
        createdAt: serverTimestamp(),
      });
      setUserProfile(userData as Member);
      setUserRole(role?.toLowerCase() as UserRole);
      return cred;
    } catch (err) {
      console.error("[AuthContext] Firestore setup failed, rolling back Auth user:", err);
      try {
        await deleteUser(cred.user);
      } catch (rollbackErr) {
        console.error("[AuthContext] CRITICAL: Rollback failed:", rollbackErr);
      }
      throw err;
    }
  };

  const register = (email: string, password: string) => {
    const trimmedEmail = email.trim();
    return createUserWithEmailAndPassword(auth, trimmedEmail, password);
  };

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  const refreshProfile = async () => {
    if (currentUser) await fetchUserProfile(currentUser.uid);
  };

  const value = useMemo(() => ({
    currentUser,
    userProfile,
    userRole,
    loading,
    login,
    logout,
    createMember,
    registerUser,
    register,
    resetPassword,
    refreshProfile,
  }), [currentUser, userProfile, userRole, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
