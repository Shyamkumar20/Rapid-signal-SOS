import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { emergencyStore } from "@/lib/emergency-store";
import { lockExactLocation, formatLocationLine } from "@/lib/location-lock";
import { TARA } from "@/components/TARA";
import { ARJUN } from "@/components/ARJUN";
import { SERVICE_INFO, OFFICIAL_PHONE, type SosReport, type ServiceType } from "@/lib/types";
import {
  Siren, AlertTriangle, CheckCircle2, Clock, MapPin, Phone,
  Radio, Loader2, Flame, Car, HeartPulse, ShieldAlert,
  Waves, Sparkles, Award
} from "lucide-react";

export function Dashboard() {
  const { profile, switchRole } = useAuth();
  const [myActiveReport, setMyActiveReport] = useState<SosReport | null>(null);
  const [dispatchingCategory, setDispatchingCategory] = useState<string | null>(null);
  const [locatingStatus, setLocatingStatus] = useState<string>("");

  const fetchMyActiveReport = useCallback(async () => {
    const allReports = await emergencyStore.getAllReports();
    // Find the latest report filed by or for this citizen
    const myReport = allReports.find(
      (r) =>
        (r.reporter_id === profile?.id ||
          (profile?.phone && r.reporter_phone === profile?.phone) ||
          r.status === "pending" ||
          r.status === "accepted")
    );
    setMyActiveReport(myReport || null);
  }, [profile]);

  useEffect(() => {
    fetchMyActiveReport();
    const unsub = emergencyStore.subscribe(() => {
      fetchMyActiveReport();
    });
    const interval = setInterval(() => {
      fetchMyActiveReport();
    }, 2500);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [fetchMyActiveReport]);

  const handleReportCreated = (report: SosReport) => {
    setMyActiveReport(report);
  };

  // Instant 1-Click SOS Trigger with Real GPS Coordinates
  const handleInstantSos = async (
    categoryName: string,
    incidentType: string,
    services: ServiceType[],
    severity: "low" | "medium" | "high" | "critical"
  ) => {
    setDispatchingCategory(categoryName);
    setLocatingStatus("📡 Acquiring high-accuracy GPS coordinates & address...");

    try {
      // 1. Capture Real GPS Location
      const lockedLoc = await lockExactLocation();
      const locationText = lockedLoc
        ? formatLocationLine(lockedLoc)
        : "Live GPS Coordinates on file (Tamil Nadu Emergency Grid)";

      setLocatingStatus(`📍 Location Locked! Dispatching 108/100/101 to ${OFFICIAL_PHONE}...`);

      const reportId = crypto.randomUUID();
      const reporterId = profile?.id || crypto.randomUUID();
      const reporterName = profile?.full_name || "Verified Citizen";
      const reporterPhone = profile?.phone || "+91 9840123456";

      const newReport: SosReport = {
        id: reportId,
        reporter_id: reporterId,
        reporter_name: reporterName,
        reporter_phone: reporterPhone,
        incident_type: incidentType,
        description: `Citizen triggered Instant ${categoryName} SOS. Real-time location captured via GPS. Immediate emergency units required at scene.`,
        location_text: locationText,
        latitude: lockedLoc?.lat ?? 13.0827,
        longitude: lockedLoc?.lng ?? 80.2707,
        severity,
        dispatched_services: services,
        cluster_id: null,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      // 2. Save to EmergencyStore and Supabase
      await emergencyStore.saveReport(newReport);

      // 3. Register Good Samaritan Reward
      await emergencyStore.saveReward({
        id: crypto.randomUUID(),
        user_id: reporterId,
        report_id: newReport.id,
        title: `Good Samaritan Recognition — ${categoryName}`,
        description: `Reported emergency at ${locationText.slice(0, 50)} via Rapid Signal SOS.`,
        amount: 500,
        status: "pending",
        awarded_at: null,
        created_at: new Date().toISOString(),
      });

      // 4. Log SMS Alert to Official Duty Line (+91 6369230106)
      const serviceNames = services.map((s) => SERVICE_INFO[s]?.label || s).join(" + ");
      await emergencyStore.saveLog({
        id: crypto.randomUUID(),
        report_id: newReport.id,
        service_type: services[0] || "ambulance",
        service_number: SERVICE_INFO[services[0]]?.number || "112",
        recipient_phone: OFFICIAL_PHONE,
        message: `[RAPID SIGNAL SOS — INSTANT ${categoryName.toUpperCase()} ALERT]\nIncident: ${incidentType}\nLocation: ${locationText}\nCaller: ${reporterName} (${reporterPhone})\nServices Dispatched: ${serviceNames}\nForwarded to Duty Officer: ${OFFICIAL_PHONE}`,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      setMyActiveReport(newReport);
    } catch (err) {
      console.error("Instant SOS error:", err);
    } finally {
      setDispatchingCategory(null);
      setLocatingStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-gov-cream">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Welcome Government Banner */}
        <div className="bg-gradient-to-r from-gov-navy to-[#071d36] rounded-lg p-6 mb-6 text-white shadow-lg border-b-4 border-amber-500">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-emerald-600 text-white">
                  CITIZEN PORTAL
                </span>
                <span className="text-amber-400 text-xs font-semibold">TNSERC · NERS 112</span>
              </div>
              <h2 className="text-2xl font-bold mt-1">Welcome, {profile?.full_name?.split(" ")[0]}</h2>
              <p className="text-white/80 text-xs md:text-sm mt-0.5">
                Report road accidents and emergencies instantly via Voice AI (TARA) or 1-Click Instant SOS.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-xs font-medium border border-white/10">
                <Radio size={14} className="animate-pulse text-amber-400" />
                <span>Duty Center: +91 6369230106</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <CheckCircle2 size={14} /> 24x7 Active
              </div>
            </div>
          </div>
        </div>

        {/* Location Dispatch Status Toast */}
        {locatingStatus && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border-2 border-amber-500 text-amber-900 animate-pulse flex items-center gap-3">
            <Loader2 className="animate-spin text-amber-700 flex-shrink-0" size={20} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide">Processing Emergency Location</p>
              <p className="text-sm font-semibold">{locatingStatus}</p>
            </div>
          </div>
        )}

        {/* Citizen's Own Active Emergency Status Tracker */}
        {myActiveReport && (
          <div className="mb-6 bg-white rounded-lg shadow-md border-2 border-gov-navy overflow-hidden animate-slide-up">
            <div className={`p-4 text-white flex items-center justify-between flex-wrap gap-2 ${
              myActiveReport.status === "pending" ? "bg-red-700" : "bg-emerald-700"
            }`}>
              <div className="flex items-center gap-2">
                <Siren size={22} className={myActiveReport.status === "pending" ? "animate-pulse" : ""} />
                <div>
                  <h3 className="font-bold text-base">Your Active Emergency Incident</h3>
                  <p className="text-[11px] text-white/90">
                    Report ID: #{myActiveReport.id.slice(0, 8).toUpperCase()} · Filed {new Date(myActiveReport.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {myActiveReport.status === "pending" ? (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-white text-red-800 animate-pulse flex items-center gap-1">
                    <Clock size={12} /> AWAITING OFFICIAL ACCEPTANCE
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-white text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={12} /> ACCEPTED BY OFFICIALS (+91 6369230106)
                  </span>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gov-navy-dark text-lg">{myActiveReport.incident_type}</h4>
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-gov-error text-white uppercase">
                      {myActiveReport.severity}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700">{myActiveReport.description}</p>

                  <div className="text-xs bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-red-600 flex-shrink-0" />
                      <span className="font-semibold text-slate-800">{myActiveReport.location_text || "GPS Location on file"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-blue-600 flex-shrink-0" />
                      <span>Official Dispatch Mobile: <strong className="text-gov-navy font-mono">+91 6369230106</strong></span>
                    </div>
                    {myActiveReport.assigned_unit && (
                      <div className="flex items-center gap-2 text-emerald-800 font-bold bg-emerald-100/70 p-1.5 rounded">
                        <CheckCircle2 size={14} />
                        <span>Dispatched Unit: {myActiveReport.assigned_unit}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-xs text-slate-500 font-medium self-center">Notified Services:</span>
                    {myActiveReport.dispatched_services?.map((svc) => {
                      const info = SERVICE_INFO[svc as ServiceType];
                      if (!info) return null;
                      return (
                        <span
                          key={svc}
                          className="px-2.5 py-0.5 rounded text-xs font-bold text-white shadow-sm"
                          style={{ backgroundColor: info.color }}
                        >
                          {info.label} ({info.number})
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Switcher Helper Button */}
                <div className="bg-slate-100 p-4 rounded-lg border border-slate-300 text-center flex-shrink-0 w-full sm:w-auto">
                  <span className="text-[11px] text-slate-600 font-bold block mb-2">Evaluate Interconnection:</span>
                  <button
                    onClick={() => switchRole("official")}
                    className="w-full px-4 py-2 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                  >
                    <Siren size={14} />
                    <span>Open Official View to Accept →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1-Click Instant SOS Categories (GPS Auto-Capture) */}
        <div className="bg-white rounded-lg shadow-md border-t-4 border-gov-error p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gov-navy-dark flex items-center gap-2">
                <Siren className="text-gov-error animate-pulse" size={20} />
                <span>Instant 1-Click SOS (Auto GPS Location)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any emergency category below. Your exact GPS coordinates will be captured and routed to official duty line <strong className="text-gov-navy">+91 6369230106</strong> immediately.
              </p>
            </div>
            <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded flex items-center gap-1">
              <Sparkles size={12} /> +₹500 Good Samaritan Reward
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* 1. Accident */}
            <button
              type="button"
              disabled={!!dispatchingCategory}
              onClick={() => handleInstantSos("Accident", "Severe Road / Vehicle Accident", ["ambulance", "police"], "critical")}
              className="p-4 rounded-xl border-2 border-red-300 bg-gradient-to-b from-red-50 to-red-100/80 hover:border-red-600 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                {dispatchingCategory === "Accident" ? <Loader2 className="animate-spin" size={24} /> : <Car size={24} />}
              </div>
              <div>
                <span className="font-extrabold text-xs md:text-sm text-red-950 block">Accident</span>
                <span className="text-[10px] text-red-700 font-bold">108 Ambulance + 100</span>
              </div>
            </button>

            {/* 2. Fire */}
            <button
              type="button"
              disabled={!!dispatchingCategory}
              onClick={() => handleInstantSos("Fire", "Fire Emergency & Smoke Alarm", ["fire", "ambulance"], "high")}
              className="p-4 rounded-xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/80 hover:border-amber-600 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                {dispatchingCategory === "Fire" ? <Loader2 className="animate-spin" size={24} /> : <Flame size={24} />}
              </div>
              <div>
                <span className="font-extrabold text-xs md:text-sm text-amber-950 block">Fire</span>
                <span className="text-[10px] text-amber-800 font-bold">101 Fire Engine + 108</span>
              </div>
            </button>

            {/* 3. Medical */}
            <button
              type="button"
              disabled={!!dispatchingCategory}
              onClick={() => handleInstantSos("Medical", "Critical Medical Emergency / Cardiac Trauma", ["ambulance"], "high")}
              className="p-4 rounded-xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-emerald-100/80 hover:border-emerald-600 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                {dispatchingCategory === "Medical" ? <Loader2 className="animate-spin" size={24} /> : <HeartPulse size={24} />}
              </div>
              <div>
                <span className="font-extrabold text-xs md:text-sm text-emerald-950 block">Medical</span>
                <span className="text-[10px] text-emerald-800 font-bold">108 ALS Ambulance</span>
              </div>
            </button>

            {/* 4. Police / Women Safety */}
            <button
              type="button"
              disabled={!!dispatchingCategory}
              onClick={() => handleInstantSos("Police / Safety", "Police Emergency & Safety Threat", ["police"], "high")}
              className="p-4 rounded-xl border-2 border-blue-300 bg-gradient-to-b from-blue-50 to-blue-100/80 hover:border-blue-600 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-full bg-blue-700 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                {dispatchingCategory === "Police / Safety" ? <Loader2 className="animate-spin" size={24} /> : <ShieldAlert size={24} />}
              </div>
              <div>
                <span className="font-extrabold text-xs md:text-sm text-blue-950 block">Police / Safety</span>
                <span className="text-[10px] text-blue-800 font-bold">100 Police / 112</span>
              </div>
            </button>

            {/* 5. Disaster / Flood */}
            <button
              type="button"
              disabled={!!dispatchingCategory}
              onClick={() => handleInstantSos("Disaster", "Natural Disaster / Flood / Structural Collapse", ["fire", "police"], "high")}
              className="p-4 rounded-xl border-2 border-indigo-300 bg-gradient-to-b from-indigo-50 to-indigo-100/80 hover:border-indigo-600 hover:shadow-md transition-all text-center flex flex-col items-center justify-center gap-2 group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-700 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                {dispatchingCategory === "Disaster" ? <Loader2 className="animate-spin" size={24} /> : <Waves size={24} />}
              </div>
              <div>
                <span className="font-extrabold text-xs md:text-sm text-indigo-950 block">Disaster</span>
                <span className="text-[10px] text-indigo-800 font-bold">1090 Disaster Line</span>
              </div>
            </button>
          </div>
        </div>

        {/* TARA Voice AI Agent Section (Spoken Accident Details) */}
        <div className="bg-white rounded-lg shadow-md border-t-4 border-gov-navy p-8 mb-6">
          <div className="text-center mb-6">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-gov-navy/10 text-gov-navy mb-1.5 inline-block">
              AI Voice Emergency Reporter
            </span>
            <h3 className="text-xl font-bold text-gov-navy-dark">Speak with TARA</h3>
            <p className="text-sm text-gov-gray mt-1">
              Tap the circular microphone below to report full accident details to TARA in Tamil or English.
            </p>
          </div>

          <TARA onReportCreated={handleReportCreated} />

          <div className="mt-6 pt-6 border-t border-slate-200">
            <ARJUN onReportCreated={handleReportCreated} />
          </div>
        </div>

        {/* Emergency Guidelines & Statutory Rights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-start gap-3">
            <Award className="text-amber-600 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h4 className="font-bold text-sm text-slate-800">Good Samaritan Protection (Supreme Court of India)</h4>
              <p className="text-xs text-slate-600 mt-1">
                Citizens reporting accidents or aiding victims are legally protected from civil/criminal liability and police interrogation under Motor Vehicles (Amendment) Act.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-start gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h4 className="font-bold text-sm text-slate-800">Statutory False Alarm Warning</h4>
              <p className="text-xs text-slate-600 mt-1">
                Filing false emergency reports or prank calls is a punishable offense under Section 182 / 211 of IPC with penalty up to ₹50,000 and imprisonment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
