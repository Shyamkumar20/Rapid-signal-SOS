import { OFFICIAL_PHONE, SERVICE_INFO, type SosReport } from "@/lib/types";
import type { IncidentIntel } from "@/lib/incident-intel";
import type { LockedLocation } from "@/lib/location-lock";
import { officialSmsUrl, officialWhatsAppUrl } from "@/lib/arjun-pipeline";
import { downloadAccidentWord } from "@/lib/word-report";
import { agentBus } from "@/lib/agent-bus";
import { Siren, MapPin, Phone, FileText, MessageCircle, X, AlertTriangle } from "lucide-react";

export interface EmergencyAlertState {
  report: SosReport;
  intel: IncidentIntel;
  location: LockedLocation | null;
  alertMessage: string;
  wordFile?: string;
}

interface Props {
  alert: EmergencyAlertState;
  onClose: () => void;
}

export function EmergencyAlertPopup({ alert, onClose }: Props) {
  const { report, intel, location, alertMessage, wordFile } = alert;

  const redownload = async () => {
    await downloadAccidentWord({
      report,
      intel,
      location,
      transcript: agentBus.getTranscriptText(),
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/75 animate-fade-in">
      <div className="absolute inset-0 pointer-events-none emergency-flash" />
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-gov-error animate-slide-up">
        <div className="bg-gov-error text-white px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Siren className="animate-bounce flex-shrink-0" size={26} />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-white/80">Emergency alert popup</p>
              <h2 className="text-lg font-bold leading-tight">ARJUN filed an accident FIR</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/15" aria-label="Close alert">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="rounded-md bg-gov-warning-light border border-gov-warning/40 p-3 text-xs text-gov-gray-dark">
            <span className="font-bold text-gov-navy">Legal routing: </span>
            Police 100, Ambulance 108 and Fire 101 are not contacted live. This popup and the Word report are sent to
            the designated number <span className="font-mono font-bold">{OFFICIAL_PHONE}</span>.
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gov-cream rounded-md p-2">
              <p className="text-[10px] uppercase text-gov-gray">Incident</p>
              <p className="font-semibold text-gov-navy-dark">{intel.incidentType}</p>
            </div>
            <div className="bg-gov-cream rounded-md p-2">
              <p className="text-[10px] uppercase text-gov-gray">Severity</p>
              <p className="font-semibold text-gov-error uppercase">{intel.severity}</p>
            </div>
          </div>

          <p className="text-sm text-gov-gray-dark">{intel.summary}</p>

          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="text-gov-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gov-navy-dark">{location?.address || report.location_text}</p>
              {location && (
                <p className="text-xs font-mono text-gov-gray">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  {location.accuracyMeters != null ? ` ±${Math.round(location.accuracyMeters)}m` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {intel.services.map((svc) => {
              const info = SERVICE_INFO[svc];
              return (
                <span
                  key={svc}
                  className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: info.color }}
                >
                  {info.label} {info.number} → {OFFICIAL_PHONE}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold text-gov-navy">
            <Phone size={14} />
            Alert recipient: {OFFICIAL_PHONE}
          </div>

          {wordFile && (
            <p className="text-xs text-gov-green-dark flex items-center gap-1">
              <FileText size={12} /> Word FIR downloaded: {wordFile}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <a
              href={officialWhatsAppUrl(alertMessage)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#128C7E] text-white text-sm font-bold hover:opacity-90"
            >
              <MessageCircle size={16} /> Send FIR alert on WhatsApp
            </a>
            <a
              href={officialSmsUrl(alertMessage)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gov-navy text-white text-sm font-bold hover:bg-gov-navy-dark"
            >
              <Phone size={16} /> Send SMS to duty number
            </a>
            {location && (
              <a
                href={location.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-gov-navy text-gov-navy text-sm font-bold hover:bg-gov-cream"
              >
                <MapPin size={16} /> Open exact map pin
              </a>
            )}
            <button
              type="button"
              onClick={() => void redownload()}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-gov-error text-gov-error text-sm font-bold hover:bg-gov-error-light"
            >
              <FileText size={16} /> Download Word report
            </button>
          </div>

          <p className="text-[11px] text-gov-gray flex items-start gap-1">
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
            WhatsApp/SMS opens on this device addressed to {OFFICIAL_PHONE}. Attach the downloaded .docx if the chat
            allows documents.
          </p>
        </div>
      </div>
    </div>
  );
}
