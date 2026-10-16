import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { emergencyStore } from "@/lib/emergency-store";
import { SERVICE_INFO, SEVERITY_INFO, OFFICIAL_PHONE, type SosReport, type ServiceType, type DispatchLog } from "@/lib/types";
import {
  Siren, AlertTriangle, CheckCircle2, Clock, MapPin, Phone,
  Activity, Radio, Volume2, VolumeX, Shield,
  Search, ExternalLink, Check
} from "lucide-react";

export function OfficialPortal({ activeTab = "official_triage" }: { activeTab?: string }) {
  const { profile } = useAuth();
  const [reports, setReports] = useState<SosReport[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "accepted" | "resolved">("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<SosReport | null>(null);
  const [assignedUnitInput, setAssignedUnitInput] = useState("TN-108-EMR-204");
  const [officialNoteInput, setOfficialNoteInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [sirenSound, setSirenSound] = useState(false);
  const activeBroadcast = "ALL EMERGENCY UNITS: High priority response active across Tamil Nadu Highways (NH-45, NH-4). Maintain < 8 min response time.";

  const prevPendingCount = useRef(0);

  // Play audio alert tone on new pending emergency
  const playAlertChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  const fetchReports = useCallback(async () => {
    const allReports = await emergencyStore.getAllReports();
    const pendingCount = allReports.filter((r) => r.status === "pending").length;
    if (pendingCount > prevPendingCount.current && sirenSound) {
      playAlertChime();
    }
    prevPendingCount.current = pendingCount;
    setReports(allReports);
    setLoading(false);
  }, [playAlertChime, sirenSound]);

  const fetchLogs = useCallback(async () => {
    const logs = await emergencyStore.getAllLogs();
    setDispatchLogs(logs);
  }, []);

  useEffect(() => {
    Promise.all([fetchReports(), fetchLogs()]);
    const unsub = emergencyStore.subscribe(() => {
      fetchReports();
      fetchLogs();
    });
    const timer = setInterval(() => {
      fetchReports();
      fetchLogs();
    }, 3000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [fetchReports, fetchLogs]);

  const handleAcceptAndDispatch = async (report: SosReport, unit?: string) => {
    setActionLoading(true);
    const assigned = unit || assignedUnitInput || "TN-108-EMR-204";
    try {
      const note = officialNoteInput || "Dispatched by Duty Officer Ganesh Kumar";
      await emergencyStore.updateReportStatus(report.id, "accepted", assigned, note);

      const logEntry: DispatchLog = {
        id: crypto.randomUUID(),
        report_id: report.id,
        service_type: "ambulance",
        service_number: "108",
        recipient_phone: OFFICIAL_PHONE,
        message: `[OFFICIAL ACCEPTED & DISPATCHED]\nUnit ${assigned} assigned to Report #${report.id.slice(0, 8).toUpperCase()}.\nLocation: ${report.location_text}\nOfficer: Inspector Ganesh Kumar`,
        status: "accepted",
        sent_at: new Date().toISOString(),
      };
      await emergencyStore.saveLog(logEntry);

      await Promise.all([fetchReports(), fetchLogs()]);
      setSelectedReport(null);
      setOfficialNoteInput("");
    } catch (err) {
      console.error("Accept error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (reportId: string) => {
    setActionLoading(true);
    try {
      await emergencyStore.updateReportStatus(reportId, "resolved");
      await Promise.all([fetchReports(), fetchLogs()]);
      setSelectedReport(null);
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlagFalseReport = async (report: SosReport) => {
    if (!confirm(`Warning: Impose statutory ₹50,000 fine on ${report.reporter_name} (${report.reporter_phone}) for false emergency reporting under Section 182 IPC?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await supabase
        .from("sos_reports")
        .update({
          is_false_report: true,
          fine_amount: 50000,
          status: "resolved",
          official_notes: "FLAGGED: Malicious / False Report. Statutory fine ₹50,000 imposed under IPC 182.",
        })
        .eq("id", report.id);

      await supabase
        .from("rewards")
        .delete()
        .eq("report_id", report.id);

      await fetchReports();
      setSelectedReport(null);
    } catch (err) {
      console.error("Flag error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const parseServices = (services: unknown): ServiceType[] => {
    if (Array.isArray(services)) return services as ServiceType[];
    if (typeof services === "string") {
      try {
        const p = JSON.parse(services);
        if (Array.isArray(p)) return p as ServiceType[];
      } catch {
        return [];
      }
    }
    return [];
  };

  const filteredReports = reports.filter((r) => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSev = filterSeverity === "all" || r.severity === filterSeverity;
    const matchSearch =
      searchQuery === "" ||
      r.incident_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reporter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reporter_phone.includes(searchQuery);
    return matchStatus && matchSev && matchSearch;
  });

  const pendingList = reports.filter((r) => r.status === "pending");
  const acceptedList = reports.filter((r) => r.status === "accepted");
  const resolvedList = reports.filter((r) => r.status === "resolved");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-12">
      {/* Officer Top Command Bar */}
      <div className="bg-[#0b2545] text-white border-b border-amber-500/40 px-4 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg animate-pulse">
              <Siren size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                  Tamil Nadu Emergency Response Centre (TNSERC)
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-700 text-white">
                  DUTY OFFICER CONSOLE
                </span>
              </div>
              <p className="text-xs text-amber-300 font-medium">
                Officer In-Charge: {profile?.full_name || "Inspector Ganesh Kumar"} · Duty Mobile: <span className="font-mono text-white font-bold">{OFFICIAL_PHONE}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setSirenSound(!sirenSound);
                if (!sirenSound) playAlertChime();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all shadow-sm ${
                sirenSound ? "bg-amber-500 text-slate-950 ring-2 ring-amber-300" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              }`}
            >
              {sirenSound ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span>{sirenSound ? "Audio Chime ON" : "Audio Chime Muted"}</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/60 border border-emerald-500/40 rounded text-xs font-semibold text-emerald-300">
              <Radio size={14} className="animate-pulse" />
              <span>Live Feed: 4s Auto-Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Advisory */}
      {activeBroadcast && (
        <div className="bg-amber-50 border-y border-amber-300 px-4 py-2 text-xs font-semibold text-amber-900 flex items-center justify-between">
          <div className="max-w-7xl mx-auto flex items-center gap-2 w-full">
            <span className="px-2 py-0.5 bg-amber-600 text-white rounded font-bold text-[10px] tracking-wide uppercase">
              Official Alert
            </span>
            <span className="flex-1 truncate">{activeBroadcast}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-l-red-600 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Awaiting Dispatch</p>
                <p className="text-3xl font-extrabold text-red-600 mt-1">{pendingList.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={22} className={pendingList.length > 0 ? "animate-bounce" : ""} />
              </div>
            </div>
            <p className="text-[11px] text-red-600 font-semibold mt-2">
              {pendingList.length > 0 ? "⚠️ Immediate Action Required" : "✓ All queues handled"}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-l-amber-500 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Units En-Route</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">{acceptedList.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Siren size={22} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-2">Ambulance / Police / Fire deployed</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-l-emerald-600 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved Cases</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{resolvedList.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-2">Treated / Closed incidents</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-l-indigo-600 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total SMS Alerts</p>
                <p className="text-3xl font-extrabold text-indigo-700 mt-1">{dispatchLogs.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Radio size={22} />
              </div>
            </div>
            <p className="text-[11px] text-indigo-700 font-mono font-bold mt-2">Target: {OFFICIAL_PHONE}</p>
          </div>
        </div>

        {/* Tab View */}
        {activeTab === "official_logs" ? (
          <DispatchLogsView logs={dispatchLogs} />
        ) : activeTab === "official_clusters" ? (
          <ClusterView reports={reports} />
        ) : (
          /* Main Live Triage Queue */
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Filter toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-600 uppercase">Filter:</span>
                {(["all", "pending", "accepted", "resolved"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      filterStatus === st
                        ? "bg-gov-navy text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-300"
                    }`}
                  >
                    {st === "all" ? "All Queue" : st.charAt(0).toUpperCase() + st.slice(1)}
                    {st === "pending" && pendingList.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px]">
                        {pendingList.length}
                      </span>
                    )}
                  </button>
                ))}

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded text-slate-700 outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical Only</option>
                  <option value="high">High Severity</option>
                  <option value="medium">Medium Severity</option>
                  <option value="low">Low Severity</option>
                </select>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search incident, caller, location..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 bg-white focus:border-gov-navy outline-none"
                />
              </div>
            </div>

            {/* List of Triage Incidents */}
            {loading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-md shimmer-bg animate-shimmer" />
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle2 size={48} className="mx-auto mb-2 text-emerald-500" />
                <p className="font-bold text-base">No active incidents in this queue</p>
                <p className="text-xs text-slate-400 mt-1">Live emergencies submitted by citizens via TARA will instantly appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredReports.map((report) => {
                  const sev = SEVERITY_INFO[report.severity] || SEVERITY_INFO.medium;
                  const services = parseServices(report.dispatched_services);
                  const isPending = report.status === "pending";

                  return (
                    <div
                      key={report.id}
                      className={`p-4 transition-all hover:bg-slate-50 ${
                        isPending ? "bg-red-50/40 border-l-4 border-l-red-600" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="px-2.5 py-0.5 rounded text-xs font-extrabold shadow-sm uppercase tracking-wide"
                              style={{ backgroundColor: sev.bg, color: sev.color }}
                            >
                              {sev.label} Severity
                            </span>

                            <h3 className="font-bold text-base text-gov-navy-dark">{report.incident_type}</h3>

                            {isPending ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-600 text-white animate-pulse">
                                🚨 PENDING DISPATCH
                              </span>
                            ) : report.status === "accepted" ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                🚑 UNIT ASSIGNED ({report.assigned_unit || "108 Dispatched"})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ RESOLVED
                              </span>
                            )}

                            {(report.cluster_count && report.cluster_count > 1) && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-purple-600 text-white shadow-sm">
                                🚨 {report.cluster_count} WITNESSES MERGED
                              </span>
                            )}

                            {report.is_false_report && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-900 text-white">
                                ⚠️ FALSE ALARM · ₹50,000 FINE
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-700 leading-relaxed font-normal bg-white p-2.5 rounded border border-slate-200">
                            {report.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-900">
                              <MapPin size={13} className="text-red-600" />
                              <span>{report.location_text || "GPS Location on File"}</span>
                            </span>

                            {report.latitude && report.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-blue-700 hover:underline font-mono"
                              >
                                <span>[{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}]</span>
                                <ExternalLink size={11} />
                              </a>
                            )}

                            <span className="flex items-center gap-1">
                              <Phone size={13} className="text-gov-navy" />
                              <span>Caller: <strong>{report.reporter_name}</strong> ({report.reporter_phone})</span>
                            </span>

                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock size={13} />
                              <span>{new Date(report.created_at).toLocaleTimeString()} ({new Date(report.created_at).toLocaleDateString()})</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500">Required Services:</span>
                            {services.map((svc) => {
                              const info = SERVICE_INFO[svc];
                              if (!info) return null;
                              return (
                                <span
                                  key={svc}
                                  className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-sm"
                                  style={{ backgroundColor: info.color }}
                                >
                                  {info.label} ({info.number})
                                </span>
                              );
                            })}

                            <span className="ml-auto text-[11px] font-mono text-slate-500">
                              Ref: #{report.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                          {isPending ? (
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 animate-pulse"
                            >
                              <Siren size={15} />
                              <span>DISPATCH UNITS NOW</span>
                            </button>
                          ) : report.status === "accepted" ? (
                            <button
                              onClick={() => handleResolve(report.id)}
                              disabled={actionLoading}
                              className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5"
                            >
                              <Check size={14} />
                              <span>Mark Resolved</span>
                            </button>
                          ) : null}

                          <button
                            onClick={() => setSelectedReport(report)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs border border-slate-300"
                          >
                            Inspect / Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Triage Action Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border-t-4 border-red-600 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#0b2545] text-white p-4 rounded-t-lg flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Emergency Triage & Unit Dispatch</h3>
                <p className="text-xs text-amber-300">Duty Officer: Inspector Ganesh Kumar (+91 6369230106)</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-white/70 hover:text-white text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gov-navy-dark text-sm">{selectedReport.incident_type}</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded uppercase">
                    {selectedReport.severity} Severity
                  </span>
                </div>
                <p className="text-slate-700">{selectedReport.description}</p>
                <div className="mt-2 text-slate-500 flex flex-wrap gap-3">
                  <span>📍 <strong>Location:</strong> {selectedReport.location_text}</span>
                  <span>📞 <strong>Caller:</strong> {selectedReport.reporter_name} ({selectedReport.reporter_phone})</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Emergency Vehicle / Unit ID:</label>
                <input
                  type="text"
                  value={assignedUnitInput}
                  onChange={(e) => setAssignedUnitInput(e.target.value)}
                  placeholder="e.g. TN-108-CH-402 (Apollo Unit) / Fire Engine 101"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs font-semibold focus:border-gov-navy outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Duty Officer Log / Instructions:</label>
                <textarea
                  value={officialNoteInput}
                  onChange={(e) => setOfficialNoteInput(e.target.value)}
                  placeholder="e.g. Dispatched nearest 108 ALS unit with paramedic team. Police control notified."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:border-gov-navy outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900">
                <p className="font-bold">🚨 Real-time Dispatch Verification:</p>
                <p className="text-[11px] mt-0.5">
                  Clicking "Confirm Dispatch" will notify all emergency services, credit Good Samaritan recognition to the caller, and log dispatch confirmation to duty mobile <strong>{OFFICIAL_PHONE}</strong>.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleAcceptAndDispatch(selectedReport)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Siren size={15} />
                  <span>Confirm Dispatch & Accept</span>
                </button>

                <button
                  onClick={() => handleFlagFalseReport(selectedReport)}
                  disabled={actionLoading}
                  className="px-3 py-2.5 bg-slate-200 hover:bg-red-100 text-red-800 rounded font-bold text-xs border border-red-300 flex items-center gap-1"
                  title="Flag as false report to impose ₹50,000 statutory penalty"
                >
                  <Shield size={14} />
                  <span>Flag False (₹50k Fine)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DispatchLogsView({ logs }: { logs: DispatchLog[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gov-navy-dark flex items-center gap-2">
            <Radio className="text-indigo-600" />
            <span>Emergency SMS & Alert Dispatch Log (+91 6369230106)</span>
          </h3>
          <p className="text-xs text-slate-500">Official log of automated SMS dispatches to emergency duty officials</p>
        </div>
        <span className="px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold text-xs">
          Target: {OFFICIAL_PHONE}
        </span>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-8">No dispatch logs recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-gov-navy">
                  To: {log.recipient_phone} ({log.service_type?.toUpperCase()} {log.service_number})
                </span>
                <span className="text-[11px] text-slate-500">{new Date(log.sent_at).toLocaleString()}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  STATUS: {log.status?.toUpperCase()}
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                {log.message}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClusterView({ reports }: { reports: SosReport[] }) {
  const clustered = reports.filter((r) => r.cluster_id);
  const clusterGroups: Record<string, SosReport[]> = {};

  clustered.forEach((r) => {
    if (r.cluster_id) {
      if (!clusterGroups[r.cluster_id]) clusterGroups[r.cluster_id] = [];
      clusterGroups[r.cluster_id].push(r);
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gov-navy-dark flex items-center gap-2">
          <Activity className="text-purple-600" />
          <span>Multi-Witness Incident Cluster Intelligence</span>
        </h3>
        <p className="text-xs text-slate-500">
          The AI engine automatically groups distinct reports filed by different witnesses for the same accident scene.
        </p>
      </div>

      {Object.keys(clusterGroups).length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-8">No multi-witness clusters currently active.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(clusterGroups).map(([clusterId, groupReports]) => (
            <div key={clusterId} className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50/30">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded font-extrabold text-xs bg-purple-700 text-white">
                  🚨 CLUSTER #{clusterId.slice(0, 8).toUpperCase()} · {groupReports.length} WITNESSES
                </span>
                <span className="text-xs font-semibold text-purple-900">
                  {groupReports[0]?.location_text}
                </span>
              </div>

              <div className="space-y-2 mt-3">
                {groupReports.map((r, idx) => (
                  <div key={r.id} className="p-2.5 bg-white rounded border border-purple-200 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">
                        Witness {idx + 1}: {r.reporter_name} ({r.reporter_phone})
                      </p>
                      <p className="text-slate-600 text-[11px] mt-0.5">{r.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(r.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
