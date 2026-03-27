import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";

console.log('[BCTA] App.tsx loading...')

// Auth
const LoginPage = React.lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/auth/RegisterPage"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));

// Admin pages
const AdminDashboard = React.lazy(() => import("./pages/admin/Dashboard"));
const MemberList = React.lazy(() => import("./pages/admin/Members/MemberList"));
const MemberDetail = React.lazy(() => import("./pages/admin/Members/MemberDetail"));
const AddEditMember = React.lazy(() => import("./pages/admin/Members/AddEditMember"));
const AddAdmin = React.lazy(() => import("./pages/admin/Members/AddAdmin"));
const MeetingList = React.lazy(() => import("./pages/admin/Meetings/MeetingList"));
const MeetingQR = React.lazy(() => import("./pages/admin/Meetings/MeetingQR"));
const AttendanceDashboard = React.lazy(() => import("./pages/admin/Meetings/AttendanceDashboard"));
const GlobalAttendance = React.lazy(() => import("./pages/admin/Meetings/GlobalAttendance"));
const ShopList = React.lazy(() => import("./pages/admin/Shops/ShopList"));
const ShopDetail = React.lazy(() => import("./pages/admin/Shops/ShopDetail"));
const PaymentsDashboard = React.lazy(() => import("./pages/admin/Payments/PaymentsDashboard"));
const ComplaintsList = React.lazy(() => import("./pages/admin/Complaints/ComplaintsList"));
const SendNotification = React.lazy(() => import("./pages/admin/Notifications/SendNotification"));

// Member pages
const MemberDashboard = React.lazy(() => import("./pages/member/MemberDashboard"));
const MyProfile = React.lazy(() => import("./pages/member/MyProfile"));
const ScanQR = React.lazy(() => import("./pages/member/ScanQR"));
const MyPayments = React.lazy(() => import("./pages/member/MyPayments"));
const RaiseComplaint = React.lazy(() => import("./pages/member/RaiseComplaint"));
const Emergency = React.lazy(() => import("./pages/member/Emergency"));
const MyNotifications = React.lazy(() => import("./pages/member/MyNotifications"));

const ADMIN_ROLES = ["admin", "superadmin"] as const;

function TestPage() { return <div style={{padding: 20, fontSize: 24}}>BCTA is working!</div> }

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(e: Error) { return { hasError: true, error: e }; }
  render() {
    if (this.state.hasError) return <div style={{padding:20, color:'red'}}><h2>LandingPage Crashed!</h2><pre>{this.state.error?.message}</pre></div>;
    return this.props.children;
  }
}

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
        <React.Suspense fallback={
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <div className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading BCTA...</div>
          </div>
        }>
          <Routes>
            {/* Public */}
            <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />

              {/* Members */}
              <Route path="members" element={<MemberList />} />
              <Route path="members/add" element={<AddEditMember />} />
              <Route path="members/:id" element={<MemberDetail />} />
              <Route path="members/:id/edit" element={<AddEditMember />} />
              <Route path="admins/add" element={<AddAdmin />} />

              {/* Meetings */}
              <Route path="meetings" element={<MeetingList />} />
              <Route path="meetings/attendance/all" element={<GlobalAttendance />} />
              <Route path="meetings/:id" element={<MeetingQR />} />
              <Route path="meetings/:id/attendance" element={<AttendanceDashboard />} />

              {/* Shops */}
              <Route path="shops" element={<ShopList />} />
              <Route path="shops/:id" element={<ShopDetail />} />

              {/* Other admin */}
              <Route path="payments" element={<PaymentsDashboard />} />
              <Route path="complaints" element={<ComplaintsList />} />
              <Route path="notifications" element={<SendNotification />} />

              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Member routes */}
            <Route
              path="/member"
              element={
                <ProtectedRoute allowedRoles={["member", "admin", "superadmin"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<MemberDashboard />} />
              <Route path="profile" element={<MyProfile />} />
              <Route path="meetings" element={<MeetingList />} />
              <Route path="scan" element={<ScanQR />} />
              <Route path="payments" element={<MyPayments />} />
              <Route path="complaint" element={<RaiseComplaint />} />
              <Route path="emergency" element={<Emergency />} />
              <Route path="notifications" element={<MyNotifications />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </React.Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
