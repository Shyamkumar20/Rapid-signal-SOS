import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { emergencyStore } from "@/lib/emergency-store";
import { SERVICE_INFO, SEVERITY_INFO, OFFICIAL_PHONE, type SosReport, type ServiceType } from "@/lib/types";
import { FileText, MapPin, Clock, Phone, Filter, ChevronRight, AlertCircle, Download } from "lucide-react";
import { analyzeIncident } from "@/lib/incident-intel";
import { downloadAccidentWord } from "@/lib/word-report";

type FilterStatus = "all" | "pending" | "accepted" | "resolved";

function parseServices(services: unknown): ServiceType[] {
  if (Array.isArray(services)) return services as ServiceType[];
  if (typeof services === "string") {
    try {
      const parsed = JSON.parse(services);
      if (Array.isArray(parsed)) return parsed as ServiceType[];
    } catch {
      return [];
    }
  }
  return [];
}

export function ReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<SosReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedReport, setSelectedReport] = useState<SosReport | null>(null);

  const fetchReports = useCallback(async () => {
    const allReports = await emergencyStore.getAllReports();
    if (profile?.id) {
      // Filter by reporter id or phone or show recent citizen reports
      const userReports = allReports.filter(
        (r) => r.reporter_id === profile.id || (profile.phone && r.reporter_phone === profile.phone) || true
      );
      setReports(userReports);
    } else {
      setReports(allReports);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchReports();
    const unsub = emergencyStore.subscribe(() => {
      fetchReports();
    });
    return () => {
      unsub();
    };
  }, [fetchReports]);

  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen bg-gov-cream">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gov-navy-dark flex items-center gap-2">
            <FileText className="text-gov-navy" /> My SOS Reports
          </h2>
          <p className="text-sm text-gov-gray mt-1">View all emergency reports you have submitted</p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          <Filter size={16} className="text-gov-gray flex-shrink-0" />
          {(["all", "pending", "accepted", "resolved"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-gov-navy text-white"
                  : "bg-white text-gov-gray hover:text-gov-navy border border-gov-cream-dark"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-md shimmer-bg animate-shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText size={48} className="mx-auto mb-3 text-gov-gray/40" />
            <p className="text-gov-gray font-medium">No reports found</p>
            <p className="text-xs text-gov-gray mt-1">
              {filter === "all" ? "Your submitted SOS reports will appear here" : `No ${filter} reports`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => {
              const sev = SEVERITY_INFO[report.severity] || SEVERITY_INFO.medium;
              const services = parseServices(report.dispatched_services);

              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="w-full text-left bg-white rounded-lg shadow-sm border border-gov-cream-dark p-4 hover:shadow-md hover:border-gov-navy transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: sev.bg, color: sev.color }}>
                          {sev.label}
                        </span>
                        <h4 className="font-semibold text-gov-navy-dark text-sm">{report.incident_type}</h4>
                        <StatusBadge status={report.status} />
                      </div>
                      <p className="text-sm text-gov-gray-dark line-clamp-2">{report.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gov-gray flex-wrap">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {report.location_text || "N/A"}</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {new Date(report.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {services.map((svc: ServiceType) => {
                          const info = SERVICE_INFO[svc];
                          if (!info) return null;
                          return (
                            <span key={svc} className="px-2 py-0.5 rounded text-[10px] font-semibold text-white" style={{ backgroundColor: info.color }}>
                              {info.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <ChevronRight className="text-gov-gray group-hover:text-gov-navy flex-shrink-0" size={20} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: "Pending", class: "bg-gov-error/10 text-gov-error" },
    accepted: { label: "Accepted", class: "bg-gov-warning/10 text-gov-warning" },
    resolved: { label: "Resolved", class: "bg-gov-success-light text-gov-green-dark" },
  };
  const info = map[status] || map.pending;
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${info.class}`}>{info.label}</span>;
}

function ReportDetailModal({ report, onClose }: { report: SosReport; onClose: () => void }) {
  const sev = SEVERITY_INFO[report.severity] || SEVERITY_INFO.medium;
  const services = parseServices(report.dispatched_services);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gov-navy text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Report Details</h3>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
          </div>
          <p className="text-xs text-white/60 mt-1">ID: {report.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gov-gray">Incident Type</label>
            <p className="text-sm font-semibold text-gov-navy-dark mt-0.5">{report.incident_type}</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gov-gray">Severity</label>
              <p className="mt-0.5">
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: sev.bg, color: sev.color }}>
                  {sev.label}
                </span>
              </p>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gov-gray">Status</label>
              <p className="mt-0.5"><StatusBadge status={report.status} /></p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gov-gray">Description</label>
            <p className="text-sm text-gov-gray-dark mt-0.5 p-3 bg-gov-gray-light rounded-md">{report.description}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gov-gray">Location</label>
            <p className="text-sm text-gov-gray-dark mt-0.5 flex items-center gap-1">
              <MapPin size={14} /> {report.location_text || "Not available"}
            </p>
            {report.latitude && report.longitude && (
              <p className="text-xs text-gov-gray mt-1">Coordinates: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gov-gray">Dispatched Services</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {services.map((svc: ServiceType) => {
                const info = SERVICE_INFO[svc];
                if (!info) return null;
                return (
                  <span key={svc} className="px-3 py-1 rounded text-xs font-semibold text-white" style={{ backgroundColor: info.color }}>
                    {info.label} ({info.number})
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gov-gray">Reporter</label>
              <p className="text-sm text-gov-gray-dark mt-0.5 flex items-center gap-1"><Phone size={12} /> {report.reporter_name}</p>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gov-gray">Filed At</label>
              <p className="text-sm text-gov-gray-dark mt-0.5 flex items-center gap-1"><Clock size={12} /> {new Date(report.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gov-gray">Official Emergency Dispatch Target</label>
            <p className="text-sm font-semibold text-gov-navy mt-0.5 flex items-center gap-1">
              <Phone size={12} /> Duty Mobile: +91 6369230106
            </p>
          </div>

          {report.status === "pending" && (
            <div className="p-3 rounded-md bg-gov-error-light border border-gov-error/30 flex items-center gap-2">
              <AlertCircle size={16} className="text-gov-error flex-shrink-0" />
              <p className="text-xs text-gov-error">This report is active on the live feed and awaiting official acceptance.</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const services = parseServices(report.dispatched_services);
              const intel = analyzeIncident(report.description, {
                incident_type: report.incident_type,
                description: report.description,
                severity: report.severity,
                services,
              });
              void downloadAccidentWord({
                report: { ...report, dispatched_services: services },
                intel,
                location:
                  report.latitude != null && report.longitude != null
                    ? {
                        lat: report.latitude,
                        lng: report.longitude,
                        accuracyMeters: null,
                        address: report.location_text,
                        mapsUrl: `https://maps.google.com/?q=${report.latitude},${report.longitude}`,
                        capturedAt: report.created_at,
                      }
                    : null,
                transcript: report.description,
              });
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gov-navy text-white text-sm font-bold hover:bg-gov-navy-dark"
          >
            <Download size={16} /> Download ARJUN Word FIR
          </button>
          <p className="text-[11px] text-gov-gray text-center">Legal copy routed to {OFFICIAL_PHONE}</p>
        </div>
      </div>
    </div>
  );
}
