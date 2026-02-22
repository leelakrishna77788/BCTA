import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import MemberList from "./pages/admin/Members/MemberList";
import MemberDetail from "./pages/admin/Members/MemberDetail";
import AddEditMember from "./pages/admin/Members/AddEditMember";
import MeetingList from "./pages/admin/Meetings/MeetingList";
import MeetingQR from "./pages/admin/Meetings/MeetingQR";
import AttendanceDashboard from "./pages/admin/Meetings/AttendanceDashboard";
import ShopList from "./pages/admin/Shops/ShopList";
import ShopDetail from "./pages/admin/Shops/ShopDetail";
import PaymentsDashboard from "./pages/admin/Payments/PaymentsDashboard";
import ComplaintsList from "./pages/admin/Complaints/ComplaintsList";
import SendNotification from "./pages/admin/Notifications/SendNotification";

// Member pages
import MemberDashboard from "./pages/member/MemberDashboard";
import MyProfile from "./pages/member/MyProfile";
import ScanQR from "./pages/member/ScanQR";
import MyPayments from "./pages/member/MyPayments";
import RaiseComplaint from "./pages/member/RaiseComplaint";
import Emergency from "./pages/member/Emergency";

const ADMIN_ROLES = ["admin", "superadmin"];

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "12px", fontFamily: "inherit", fontSize: "13px" },
            success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<AdminDashboard />} />

            {/* Members */}
            <Route path="members" element={<MemberList />} />
            <Route path="members/add" element={<AddEditMember />} />
            <Route path="members/:id" element={<MemberDetail />} />
            <Route path="members/:id/edit" element={<AddEditMember />} />

            {/* Meetings */}
            <Route path="meetings" element={<MeetingList />} />
            <Route path="meetings/:id" element={<MeetingQR />} />
            <Route path="meetings/:id/attendance" element={<AttendanceDashboard />} />

            {/* Shops */}
            <Route path="shops" element={<ShopList />} />
            <Route path="shops/:id" element={<ShopDetail />} />

            {/* Other */}
            <Route path="payments" element={<PaymentsDashboard />} />
            <Route path="complaints" element={<ComplaintsList />} />
            <Route path="notifications" element={<SendNotification />} />

            {/* Default redirect */}
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Member routes */}
          <Route path="/member" element={
            <ProtectedRoute allowedRoles={["member", "admin", "superadmin"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<MemberDashboard />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="meetings" element={<MeetingList />} />
            <Route path="scan" element={<ScanQR />} />
            <Route path="payments" element={<MyPayments />} />
            <Route path="complaint" element={<RaiseComplaint />} />
            <Route path="emergency" element={<Emergency />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
