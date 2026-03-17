import React, { memo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ADMIN_ROLES = ["admin", "superadmin"];

const ProtectedRoute = memo(({ children, allowedRoles }) => {
    const { currentUser, userRole, loading } = useAuth();

    // Use normalized role for comparison
    const normalizedRole = userRole?.toLowerCase().trim() || "";
    
    // Diagnostic log for debugging flickering
    if (!loading) {
        console.log(`[ProtectedRoute] Auth check: role='${normalizedRole}', allowed=[${allowedRoles?.join(',')}]`);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Verifying Access...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        console.warn("[ProtectedRoute] No user found, redirecting to login");
        return <Navigate to="/login" replace />;
    }

    const isAllowed = allowedRoles?.map(r => r.toLowerCase().trim()).includes(normalizedRole);

    if (allowedRoles && !isAllowed) {
        console.warn(`[ProtectedRoute] Access denied for role '${normalizedRole}'. Redirecting...`);
        if (!normalizedRole) return <Navigate to="/login" replace />;

        if (normalizedRole === "member") return <Navigate to="/member/dashboard" replace />;
        const isAdmin = ADMIN_ROLES.map(r => r.toLowerCase().trim()).includes(normalizedRole);
        if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
        
        return <Navigate to="/login" replace />;
    }

    return children;
});

ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;
