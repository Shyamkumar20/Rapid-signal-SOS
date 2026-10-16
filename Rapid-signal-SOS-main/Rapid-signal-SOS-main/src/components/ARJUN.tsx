import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, Loader2, MapPin, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { agentBus } from "@/lib/agent-bus";
import { analyzeIncident } from "@/lib/incident-intel";
import { runArjunPipeline } from "@/lib/arjun-pipeline";
import { EmergencyAlertPopup, type EmergencyAlertState } from "@/components/EmergencyAlertPopup";
import type { SosReport } from "@/lib/types";

interface ARJUNProps {
  onReportCreated: (report: SosReport) => void;
}

export function ARJUN({ onReportCreated }: ARJUNProps) {
  const { profile } = useAuth();
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState<EmergencyAlertState | null>(null);

  useEffect(() => {
    const unsub = agentBus.subscribe(() => setTick((n) => n + 1));
    return () => {
      unsub();
    };
  }, []);

  const transcript = agentBus.getTranscriptText();
  const intel = useMemo(() => analyzeIncident(transcript), [transcript]);
  const coords = agentBus.getCoords();
  const listening = agentBus.isSessionActive();

  const fileReport = useCallback(async () => {
    setError("");
    setBusy(true);
    const result = await runArjunPipeline({
      profile,
      fallbackCoords: coords,
    });
    setBusy(false);
    if (!result.success || !result.report || !result.intel) {
      setError(result.error || "Could not generate the accident report.");
      return;
    }
    onReportCreated(result.report);
    setAlert({
      report: result.report,
      intel: result.intel,
      location: result.location || null,
      alertMessage: result.alertMessage,
      wordFile: result.wordFile,
    });
  }, [coords, onReportCreated, profile]);

  useEffect(() => {
    const onVoiceFiled = (ev: Event) => {
      const detail = (ev as CustomEvent<EmergencyAlertState>).detail;
      if (!detail?.report) return;
      setAlert(detail);
      onReportCreated(detail.report);
    };
    window.addEventListener("arjun-filed", onVoiceFiled as EventListener);
    return () => window.removeEventListener("arjun-filed", onVoiceFiled as EventListener);
  }, [onReportCreated]);

  return (
    <>
      <div className="rounded-lg border border-gov-cream-dark bg-gradient-to-br from-white to-gov-cream p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gov-navy text-white flex items-center justify-center">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gov-navy-dark">ARJUN — trained incident agent</h3>
              <p className="text-xs text-gov-gray">
                Reads TARA speech, locks GPS, writes a Word FIR, alerts +91 6369230106
              </p>
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${listening ? "bg-gov-error/10 text-gov-error" : "bg-gov-navy/10 text-gov-navy"}`}>
            {listening ? "Ingesting live voice" : "Standby"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="rounded-md bg-white border border-gov-cream-dark p-2">
            <p className="text-gov-gray">Classifier</p>
            <p className="font-semibold text-gov-navy-dark truncate">{intel.incidentType}</p>
          </div>
          <div className="rounded-md bg-white border border-gov-cream-dark p-2">
            <p className="text-gov-gray">Confidence</p>
            <p className="font-semibold text-gov-navy-dark">{transcript ? `${intel.confidence}%` : "—"}</p>
          </div>
          <div className="rounded-md bg-white border border-gov-cream-dark p-2">
            <p className="text-gov-gray">Severity</p>
            <p className="font-semibold uppercase">{transcript ? intel.severity : "—"}</p>
          </div>
          <div className="rounded-md bg-white border border-gov-cream-dark p-2">
            <p className="text-gov-gray flex items-center gap-1"><MapPin size={10} /> GPS</p>
            <p className="font-semibold text-gov-navy-dark">
              {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Waiting"}
            </p>
          </div>
        </div>

        {transcript && (
          <p className="mt-3 text-xs text-gov-gray-dark line-clamp-3 bg-white/70 rounded p-2 border border-gov-cream-dark">
            {agentBus.getUserSpeech() || transcript}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || (!transcript && !listening)}
            onClick={() => void fileReport()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gov-navy text-white text-sm font-bold hover:bg-gov-navy-dark disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate FIR + send alert
          </button>
          <span className="text-[11px] text-gov-gray flex items-center gap-1">
            <Shield size={12} /> Demo duty number only — not live 100/108/101
          </span>
        </div>
        {error && <p className="mt-2 text-xs text-gov-error">{error}</p>}
      </div>

      {alert && <EmergencyAlertPopup alert={alert} onClose={() => setAlert(null)} />}
    </>
  );
}
