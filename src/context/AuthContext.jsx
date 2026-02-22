import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (uid) => {
        try {
            const docRef = doc(db, "users", uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                setUserProfile(data);
                setUserRole(data.role);
                return data;
            }
            return null;
        } catch (err) {
            console.error("Error fetching user profile:", err);
            return null;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                fetchUserProfile(user.uid).finally(() => {
                    setLoading(false);
                });
            } else {
                setUserProfile(null);
                setUserRole(null);
                setLoading(false);
            }
        });
        return unsubscribe;
    }, []);

    const login = async (email, password) => {
        const trimmedEmail = email.trim();
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        const profile = await fetchUserProfile(cred.user.uid);
        if (!profile) throw new Error("User profile not found. Contact admin.");
        if (profile.status === "blocked") throw new Error("Your account is blocked. Contact admin.");
        return cred;
    };

    const logout = () => signOut(auth);

    const createMember = async (email, password, memberData) => {
        const trimmedEmail = email.trim();
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
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
    };

    const resetPassword = (email) => sendPasswordResetEmail(auth, email);

    const registerUser = async (email, password, name, role) => {
        const trimmedEmail = email.trim();
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await setDoc(doc(db, "users", cred.user.uid), {
            uid: cred.user.uid,
            name: name,
            email: email,
            role: role, // e.g., 'member' or 'admin'
            status: "active",
            createdAt: serverTimestamp(),
            // Ensure some default member fields if they register as member
            ...(role === 'member' && {
                memberId: `BCTA-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
                attendanceCount: 0,
                paymentStatus: "unpaid",
            })
        });
        return cred;
    };

    const refreshProfile = () => currentUser && fetchUserProfile(currentUser.uid);

    const value = {
        currentUser,
        userProfile,
        userRole,
        loading,
        login,
        logout,
        createMember,
        registerUser,
        resetPassword,
        refreshProfile,
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Initializing Portal...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
