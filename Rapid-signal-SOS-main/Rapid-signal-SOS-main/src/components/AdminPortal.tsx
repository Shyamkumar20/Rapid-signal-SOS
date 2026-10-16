import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { emergencyStore } from "@/lib/emergency-store";
import { SERVICE_INFO, SEVERITY_INFO, type SosReport, type ServiceType, type Reward } from "@/lib/types";
import {
  Shield, Award, CheckCircle2, Clock, MapPin,
  Activity, Trophy,
  Search, Download, Check,
  Landmark, Filter
} from "lucide-react";

export function AdminPortal({ activeTab = "admin_command" }: { activeTab?: string }) {
  const { profile } = useAuth();
  const [reports, setReports] = useState<SosReport[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [rewardProcessingId, setRewardProcessingId] = useState<string | null>(null);

  const fetchStateData = useCallback(async () => {
    const [allReports, allRewards] = await Promise.all([
      emergencyStore.getAllReports(),
      emergencyStore.getAllRewards(),
    ]);
    setReports(allReports);
    setRewards(allRewards);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStateData();
    const unsub = emergencyStore.subscribe(() => {
      fetchStateData();
    });
    const interval = setInterval(fetchStateData, 3000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [fetchStateData]);

  const handleApproveReward = async (rewardId: string, customAmount?: number) => {
    setRewardProcessingId(rewardId);
    try {
      await emergencyStore.approveReward(rewardId, customAmount);
      await fetchStateData();
    } catch (err) {
      console.error("Reward approve error:", err);
    } finally {
      setRewardProcessingId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = "ID,Reporter,Phone,IncidentType,Severity,Status,Location,CreatedAt\n";
    const rows = reports
      .map(
        (r) =>
          `"${r.id}","${r.reporter_name}","${r.reporter_phone}","${r.incident_type}","${r.severity}","${r.status}","${r.location_text.replace(/"/g, '""')}","${r.created_at}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TNSERC_Emergency_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalFundDisbursed = rewards
    .filter((r) => r.status === "awarded")
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingRewards = rewards.filter((r) => r.status === "pending");
  const awardedRewards = rewards.filter((r) => r.status === "awarded");

  // Simulated district breakdown
  const districts = [
    { name: "Chennai", count: reports.filter((r) => r.location_text?.toLowerCase().includes("chennai") || true).length, color: "bg-blue-600" },
    { name: "Coimbatore", count: Math.max(1, Math.floor(reports.length * 0.25)), color: "bg-indigo-600" },
    { name: "Madurai", count: Math.max(1, Math.floor(reports.length * 0.18)), color: "bg-amber-600" },
    { name: "Tiruchirappalli", count: Math.max(1, Math.floor(reports.length * 0.12)), color: "bg-emerald-600" },
    { name: "Salem", count: Math.max(1, Math.floor(reports.length * 0.08)), color: "bg-purple-600" },
  ];

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
    const matchDistrict = filterDistrict === "all" || r.location_text.toLowerCase().includes(filterDistrict.toLowerCase());
    const matchSearch =
      searchQuery === "" ||
      r.incident_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reporter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reporter_phone.includes(searchQuery);
    return matchStatus && matchDistrict && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-12">
      {/* Admin Top Command Header */}
      <div className="bg-[#071d36] text-white border-b-2 border-amber-500 px-4 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-indigo-700 flex items-center justify-center text-white shadow-lg">
              <Landmark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                  State Emergency Operations Command Center
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950">
                  SDMA STATE ADMIN
                </span>
              </div>
              <p className="text-xs text-amber-200 font-medium">
                Relief Commissioner: {profile?.full_name || "Dr. Shyam Kumar, IAS"} · Secretariat, Chennai
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-all shadow-sm"
            >
              <Download size={14} />
              <span>Export Incident Log (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total SOS Reports</p>
                <p className="text-3xl font-extrabold text-gov-navy-dark mt-1">{reports.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <Activity size={22} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">State-wide Real-time Total</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Response Time</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">4.8 min</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Clock size={22} />
              </div>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-2">✓ Within 8-min Mandate</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Samaritan Fund Awarded</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">₹{totalFundDisbursed.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Trophy size={22} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">{awardedRewards.length} Citizens Honored</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Reward Approvals</p>
                <p className="text-3xl font-extrabold text-indigo-700 mt-1">{pendingRewards.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Award size={22} />
              </div>
            </div>
            <p className="text-[11px] text-indigo-700 font-semibold mt-2">Good Samaritan Scheme</p>
          </div>
        </div>

        {/* Tab Conditional Views */}
        {activeTab === "admin_rewards" ? (
          <GoodSamaritanAdminView
            rewards={rewards}
            reports={reports}
            processingId={rewardProcessingId}
            onApprove={handleApproveReward}
          />
        ) : (
          /* Command Center Overview & Master Incident Table */
          <div className="space-y-6">
            {/* District Load Grid */}
            <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-red-600" />
                <span>Tamil Nadu District Response Density</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {districts.map((d) => (
                  <div key={d.name} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600">{d.name}</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1">{d.count}</p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${d.color}`} style={{ width: `${Math.min(100, (d.count / (reports.length || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Master Incidents Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gov-navy-dark flex items-center gap-2">
                    <Shield className="text-indigo-600" />
                    <span>State-wide Emergency Incident Log</span>
                  </h3>
                  <p className="text-xs text-slate-500">Live feed of all SOS reports filed across Tamil Nadu</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Filter size={14} className="text-slate-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded text-slate-700"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <select
                      value={filterDistrict}
                      onChange={(e) => setFilterDistrict(e.target.value)}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded text-slate-700"
                    >
                      <option value="all">All Locations</option>
                      <option value="chennai">Chennai</option>
                      <option value="coimbatore">Coimbatore</option>
                      <option value="madurai">Madurai</option>
                    </select>
                  </div>

                  <div className="relative w-48">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs rounded border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-md shimmer-bg animate-shimmer" />
                  ))}
                </div>
              ) : filteredReports.length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-500">No matching incident records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                        <th className="p-3">Ref ID</th>
                        <th className="p-3">Incident & Details</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Reporter</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Services</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredReports.map((report) => {
                        const sev = SEVERITY_INFO[report.severity] || SEVERITY_INFO.medium;
                        const services = parseServices(report.dispatched_services);

                        return (
                          <tr key={report.id} className="hover:bg-slate-50/80">
                            <td className="p-3 font-mono font-bold text-gov-navy">
                              #{report.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{report.incident_type}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">{report.description}</p>
                            </td>
                            <td className="p-3 text-slate-700">
                              <p className="font-medium flex items-center gap-1">
                                <MapPin size={11} className="text-red-600" />
                                <span>{report.location_text || "Coordinates on file"}</span>
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {new Date(report.created_at).toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-semibold text-slate-800">{report.reporter_name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{report.reporter_phone}</p>
                            </td>
                            <td className="p-3">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm"
                                style={{ backgroundColor: sev.bg, color: sev.color }}
                              >
                                {sev.label}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {services.map((svc) => (
                                  <span
                                    key={svc}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm"
                                    style={{ backgroundColor: SERVICE_INFO[svc]?.color }}
                                  >
                                    {SERVICE_INFO[svc]?.number}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              {report.status === "pending" ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                                  PENDING
                                </span>
                              ) : report.status === "accepted" ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  ACCEPTED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  RESOLVED
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GoodSamaritanAdminView({
  rewards,
  reports,
  processingId,
  onApprove,
}: {
  rewards: Reward[];
  reports: SosReport[];
  processingId: string | null;
  onApprove: (rewardId: string, customAmount?: number) => void;
}) {
  const pending = rewards.filter((r) => r.status === "pending");
  const awarded = rewards.filter((r) => r.status === "awarded");

  return (
    <div className="space-y-6">
      {/* Policy banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-white to-emerald-500/15 p-6 rounded-lg border border-amber-300 shadow-sm">
        <div className="flex items-start gap-4">
          <Trophy className="text-amber-600 flex-shrink-0" size={36} />
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Government of Tamil Nadu — Good Samaritan Cash Honorarium Scheme
            </h3>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
              Under the Supreme Court directives and the Ministry of Road Transport & Highways guidelines,
              citizens reporting verified road accidents and assisting victims receive an immediate cash honorarium
              (₹500 to ₹5,000) and a State Recognition Certificate.
            </p>
          </div>
        </div>
      </div>

      {/* Pending approvals */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gov-navy-dark flex items-center gap-2">
              <Award className="text-amber-600" />
              <span>Pending Citizen Reward Disbursements ({pending.length})</span>
            </h3>
            <p className="text-xs text-slate-500">Review accident assistance reports and authorize government cash payouts</p>
          </div>
        </div>

        {pending.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-8">No pending reward authorizations.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((rew) => {
              const matchedReport = reports.find((r) => r.id === rew.report_id);
              const isProcessing = processingId === rew.id;

              return (
                <div key={rew.id} className="p-4 rounded-lg bg-amber-50/40 border-2 border-amber-300 text-xs space-y-2">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{rew.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                          Awaiting State Admin Signoff
                        </span>
                      </div>
                      <p className="text-slate-700 mt-1">{rew.description}</p>
                      {matchedReport && (
                        <div className="mt-2 text-slate-600 flex flex-wrap gap-3 text-[11px]">
                          <span>📍 <strong>Location:</strong> {matchedReport.location_text}</span>
                          <span>📞 <strong>Reporter:</strong> {matchedReport.reporter_name} ({matchedReport.reporter_phone})</span>
                          <span>🚨 <strong>Incident:</strong> {matchedReport.incident_type}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-xl font-extrabold text-gov-navy-dark">₹{rew.amount.toLocaleString()}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onApprove(rew.id, 500)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check size={13} />
                          <span>Approve ₹500</span>
                        </button>
                        <button
                          onClick={() => onApprove(rew.id, 2000)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow disabled:opacity-50"
                          title="Major assistance award"
                        >
                          <span>Approve ₹2,000</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Awarded history */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-base font-bold text-gov-navy-dark mb-4 flex items-center gap-2">
          <CheckCircle2 className="text-emerald-600" />
          <span>Awarded Citizen Honor Roll ({awarded.length})</span>
        </h3>

        {awarded.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">No disbursed awards recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {awarded.map((rew) => (
              <div key={rew.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-800">{rew.title}</p>
                  <p className="text-slate-500 text-[11px]">{rew.description}</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    Disbursed on {rew.awarded_at ? new Date(rew.awarded_at).toLocaleDateString() : "Today"}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-emerald-700 text-base">₹{rew.amount.toLocaleString()}</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    DISBURSED
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
