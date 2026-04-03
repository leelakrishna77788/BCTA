import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Outlet } from "react-router-dom";

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#FFF5B] relative overflow-hidden font-sans">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden h-full">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full scroll-smooth">
          <div className="max-w-7xl mx-auto w-full animate-fade-in pb-12">
            <React.Suspense fallback={
              <div className="animate-pulse space-y-6">
                <div className="h-10 w-48 bg-slate-200 rounded-lg" />
                <div className="h-64 w-full bg-slate-100 rounded-2xl" />
              </div>
            }>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
