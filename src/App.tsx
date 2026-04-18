import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import NotificationManager from "./components/shared/NotificationManager";
import { lazyWithRetry } from "./utils/lazyRetry";


// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Version & Update Handler (Smart Deferred Reload)
function VersionHandler() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Check for pending background updates
    const hasUpdate = localStorage.getItem("app_update_available");
    if (hasUpdate === "true" && navigator.onLine) {
      console.log("[VersionHandler] New version ready. Applying reload on navigation to:", pathname);
      localStorage.removeItem("app_update_available");
      
      // Small timeout to ensure smoother transition
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, [pathname]);

  return null;
}

// Auth
const LoginPage = lazyWithRetry(() => import("./pages/auth/LoginPage"));
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage"));
const ServicesPage = lazyWithRetry(() => import("./pages/ServicesPage"));
const AboutPage = lazyWithRetry(() => import("./pages/AboutPage"));
const MemberToolsPage = lazyWithRetry(() => import("./pages/MemberToolsPage"));
const ContactPage = lazyWithRetry(() => import("./pages/ContactPage"));
const PresidentsPage = lazyWithRetry(() => import("./pages/PresidentsPage"));

// Admin pages
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/Dashboard"));
const MemberList = lazyWithRetry(() => import("./pages/admin/Members/MemberList"));
const MemberDetail = lazyWithRetry(() => import("./pages/admin/Members/MemberDetail"));
const AddEditMember = lazyWithRetry(() => import("./pages/admin/Members/AddEditMember"));
const AddAdmin = lazyWithRetry(() => import("./pages/admin/Members/AddAdmin"));
const MeetingList = lazyWithRetry(() => import("./pages/admin/Meetings/MeetingList"));
const MeetingQR = lazyWithRetry(() => import("./pages/admin/Meetings/MeetingQR"));
const AttendanceDashboard = lazyWithRetry(() => import("./pages/admin/Meetings/AttendanceDashboard"));
const GlobalAttendance = lazyWithRetry(() => import("./pages/admin/Meetings/GlobalAttendance"));
const ShopList = lazyWithRetry(() => import("./pages/admin/Shops/ShopList"));
const PaymentsDashboard = lazyWithRetry(() => import("./pages/admin/Payments/PaymentsDashboard"));
const PaymentsHistory = lazyWithRetry(() => import("./pages/admin/Payments/PaymentsHistory"));
const ComplaintsList = lazyWithRetry(() => import("./pages/admin/Complaints/ComplaintsList"));
const SendNotification = lazyWithRetry(() => import("./pages/admin/Notifications/SendNotification"));

// Member pages
const MemberDashboard = lazyWithRetry(() => import("./pages/member/MemberDashboard"));
const MyProfile = lazyWithRetry(() => import("./pages/member/MyProfile"));
const ScanQR = lazyWithRetry(() => import("./pages/member/ScanQR"));
const MyPayments = lazyWithRetry(() => import("./pages/member/MyPayments"));
const RaiseComplaint = lazyWithRetry(() => import("./pages/member/RaiseComplaint"));
const Emergency = lazyWithRetry(() => import("./pages/member/Emergency"));
const MyNotifications = lazyWithRetry(() => import("./pages/member/MyNotifications"));

const ADMIN_ROLES = ["admin", "superadmin"] as const;

function TestPage() { return <div style={{padding: 20, fontSize: 24}}>BCTA is working!</div> }

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(e: Error) { return { hasError: true, error: e }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-300 via-blue-150 to-yellow-400 p-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-lg w-full border-2 border-red-200">
            <h2 className="text-2xl font-black text-red-600 mb-4">Oops! Something went wrong</h2>
            <p className="text-slate-700 mb-4">We encountered an error while loading this page.</p>
            <pre className="bg-red-50 p-4 rounded-lg text-xs text-red-800 overflow-auto mb-4">{this.state.error?.message}</pre>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  // Version Control System
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // fetch with no-cache to get real JSON from server
        const res = await fetch("/version.json?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) return;
        
        const data = await res.json();
        const serverVersion = data.version;
        const localVersion = localStorage.getItem("app_version");

        if (localVersion && localVersion !== serverVersion) {
          console.warn("[App] Version mismatch. Server:", serverVersion, "Local:", localVersion);
          localStorage.setItem("app_update_available", "true");
          toast((t) => (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">New version available!</span>
              <button 
                onClick={() => {
                  toast.dismiss(t.id);
                  window.location.reload();
                }}
                className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                Reload Now
              </button>
            </div>
          ), {
            icon: "🚀",
            duration: 10000,
            position: "bottom-right"
          });
        }
        
        // Update local version after check
        localStorage.setItem("app_version", serverVersion);
      } catch (e) {
        console.log("[VersionCheck] Failed:", e);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(interval);
  }, []);

  // Backwards compatibility / cleanup
  useEffect(() => {
    if (sessionStorage.getItem("loginReload")) {
      sessionStorage.removeItem("loginReload");
    }
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <VersionHandler />
      <AuthProvider>
        <NotificationManager />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "12px", fontFamily: "inherit", fontSize: "13px" },
            success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />
        <React.Suspense fallback={
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 overflow-hidden relative isolate">
            {/* Background decorative elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-violet-600/15 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl mb-8 animate-logo-float">
                <span className="text-white font-black text-xl tracking-tighter">BCTA</span>
              </div>
              <div className="relative w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="absolute inset-0 bg-linear-to-r from-indigo-500 via-violet-500 to-indigo-500 w-full rounded-full animate-loading-progress shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              </div>
              <p className="mt-6 text-indigo-300/60 font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">Initializing Portal</p>
            </div>
          </div>
        }>
          <Routes>
            {/* Public */}
            <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
            <Route path="/services" element={<ErrorBoundary><ServicesPage /></ErrorBoundary>} />
            <Route path="/about" element={<ErrorBoundary><AboutPage /></ErrorBoundary>} />
            <Route path="/member-tools" element={<ErrorBoundary><MemberToolsPage /></ErrorBoundary>} />
            <Route path="/presidents" element={<ErrorBoundary><PresidentsPage /></ErrorBoundary>} />
            <Route path="/contact" element={<ErrorBoundary><ContactPage /></ErrorBoundary>} />
            <Route path="/login" element={<LoginPage />} />

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

              {/* Other admin */}
              <Route path="payments" element={<PaymentsDashboard />} />
              <Route path="payments/history" element={<PaymentsHistory />} />
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
