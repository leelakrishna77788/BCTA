import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileBottomNav from "./MobileBottomNav";
import { Outlet } from "react-router-dom";

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen relative overflow-hidden font-sans" style={{ background: "var(--surface-base)" }}>
      {/* Subtle background mesh gradient */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "var(--gradient-mesh)",
        opacity: 0.7,
      }} />

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden h-full pb-16 md:pb-0">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 w-full scroll-smooth scrollbar-hide">
          <div className="max-w-7xl mx-auto w-full animate-fade-in pb-12">
            <React.Suspense fallback={
              <div className="space-y-6 animate-pulse">
                <div className="h-10 w-52 bg-slate-200/60 rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-28 bg-white/60 rounded-xl border border-slate-200/60" />
                  ))}
                </div>
                <div className="h-64 bg-white/60 rounded-xl border border-slate-200/60" />
              </div>
            }>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
        <MobileBottomNav onMenuClick={() => setMobileOpen(true)} />
      </div>
    </div>
  );
};

export default DashboardLayout;
