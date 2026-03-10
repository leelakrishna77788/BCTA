import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ADMIN_ROLES = ["admin", "superadmin"];

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { currentUser, userRole, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) return <Navigate to="/login" replace />;

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        // If profile fetch failed or role is missing, redirect to a safe place or logout
        if (!userRole) return <Navigate to="/login" replace />;

        if (userRole === "member") return <Navigate to="/member/dashboard" replace />;
        if (ADMIN_ROLES.includes(userRole)) return <Navigate to="/admin/dashboard" replace />;
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
