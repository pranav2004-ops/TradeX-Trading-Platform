 import { useState } from "react";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

export default function DashboardLayout({ children, onStockSelect }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#f5f7fa]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-56 flex flex-col min-h-screen">
        <TopNavbar onStockSelect={onStockSelect} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 px-5 py-5 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}