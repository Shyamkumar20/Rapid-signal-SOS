import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Header, Footer } from "@/components/Layout";
import { AuthPage } from "@/components/AuthPage";
import { Dashboard } from "@/components/Dashboard";
import { ReportsPage } from "@/components/ReportsPage";
import { RewardsPage } from "@/components/RewardsPage";
import { OfficialPortal } from "@/components/OfficialPortal";
import { AdminPortal } from "@/components/AdminPortal";
import { Loader2 } from "lucide-react";
import { AshokaChakra, TamilNaduEmblem, GovernmentEmblem } from "@/components/GovernmentSymbols";

function AppContent() {
  const { user, profile, role, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    if (!user) {
      setCurrentPage("dashboard");
    } else if (role === "official") {
      setCurrentPage("official_triage");
    } else if (role === "admin") {
      setCurrentPage("admin_command");
    } else {
      setCurrentPage("dashboard");
    }
  }, [user, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f9]">
        <div className="gov-stripe h-2 fixed top-0 left-0 right-0" />
        <div className="flex items-center gap-4 mb-4">
          <TamilNaduEmblem className="w-16 h-16 animate-breathe" />
          <GovernmentEmblem className="w-16 h-16 animate-breathe" />
        </div>
        <AshokaChakra className="w-8 h-8 text-gov-navy chakra-spin mb-4" />
        <div className="flex items-center gap-2 text-gov-navy font-bold">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Connecting to Tamil Nadu Emergency Response System (TNSERC)...</span>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1">
        {/* Official Role Pages */}
        {role === "official" && <OfficialPortal activeTab={currentPage} />}

        {/* Admin Role Pages */}
        {role === "admin" && <AdminPortal activeTab={currentPage} />}

        {/* Citizen Role Pages */}
        {role === "citizen" && (
          <>
            {currentPage === "dashboard" && <Dashboard />}
            {currentPage === "reports" && <ReportsPage />}
            {currentPage === "rewards" && <RewardsPage />}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
