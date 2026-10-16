import { useState, useRef, useEffect, useCallback } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useAuth } from "@/lib/auth-context";
import { AshokaChakra } from "@/components/GovernmentSymbols";
import { SERVICE_INFO, OFFICIAL_PHONE, type SosReport } from "@/lib/types";
import { agentBus } from "@/lib/agent-bus";
import { runArjunPipeline } from "@/lib/arjun-pipeline";
import {
  Mic, Radio, MapPin, AlertTriangle,
  CheckCircle2, Loader2, Siren, Volume2, X,
  Send, Sparkles
} from "lucide-react";

const ELEVENLABS_AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || "";

interface TARAProps {
  onReportCreated: (report: SosReport) => void;
}

// Speech Recognition type declarations for TypeScript
interface WebkitSpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal?: boolean;
    };
    length: number;
  };
}

interface WebkitSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: () => void;
  onresult: (event: WebkitSpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
}

function TARAContent({ onReportCreated }: TARAProps) {
  const { profile } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [reportStatus, setReportStatus] = useState<"idle" | "creating" | "dispatching" | "success" | "error">("idle");
  const [activeReport, setActiveReport] = useState<SosReport | null>(null);
  const [manualSpeechText, setManualSpeechText] = useState("");

  // Native WebSpeech fallback state
  const [isNativeListening, setIsNativeListening] = useState(false);
  const [isNativeSpeaking, setIsNativeSpeaking] = useState(false);
  const recognitionRef = useRef<WebkitSpeechRecognition | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const requestLocation = useCallback(() => {
    setLocationStatus("requesting");
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        agentBus.setCoords(coords);
        setLocationStatus("granted");
      },
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Get location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Text to speech helper for built-in TARA voice
  const speakText = useCallback((text: string, onDone?: () => void) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        // Try Indian English voice if available
        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find((v) => v.lang.includes("en-IN") || v.name.includes("India"));
        if (indianVoice) utterance.voice = indianVoice;

        utterance.onstart = () => setIsNativeSpeaking(true);
        utterance.onend = () => {
          setIsNativeSpeaking(false);
          if (onDone) onDone();
        };
        utterance.onerror = () => {
          setIsNativeSpeaking(false);
          if (onDone) onDone();
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsNativeSpeaking(false);
        if (onDone) onDone();
      }
    } else {
      if (onDone) onDone();
    }
  }, []);

  // Submit collected voice report
  const processAndSubmitReport = useCallback(
    async (spokenText?: string) => {
      setReportStatus("dispatching");
      const userText = spokenText || agentBus.getUserSpeech() || manualSpeechText || "Accident emergency reported by citizen";

      try {
        const result = await runArjunPipeline({
          profile,
          voiceHints: {
            description: userText,
          },
          fallbackCoords: userCoords,
        });

        if (!result.success || !result.report) {
          throw new Error(result.error || "ARJUN could not file the report");
        }

        setReportStatus("success");
        setActiveReport(result.report);
        onReportCreated(result.report);
        window.dispatchEvent(new CustomEvent("arjun-filed", { detail: result }));

        speakText("Emergency registered successfully. Units dispatched to the official duty number.");
      } catch (err) {
        setReportStatus("error");
        setError(err instanceof Error ? err.message : "Failed to register report");
      }
    },
    [profile, userCoords, manualSpeechText, onReportCreated, speakText]
  );

  // Client tools that TARA can call during ElevenLabs conversation
  const clientTools = {
    get_user_location: async () => {
      if (userCoords) {
        return JSON.stringify({
          latitude: userCoords.lat,
          longitude: userCoords.lng,
          status: "granted",
        });
      }
      return JSON.stringify({ status: "denied", message: "Location not available" });
    },
    enable_location: async () => {
      requestLocation();
      return JSON.stringify({ status: "requesting" });
    },
    get_reporter_info: async () => {
      return JSON.stringify({
        name: profile?.full_name || "Unknown Citizen",
        phone: profile?.phone || "Unknown",
      });
    },
    submit_sos_report: async (params: {
      incident_type?: string;
      description?: string;
      location_text?: string;
      severity?: string;
      services?: string[];
    }) => {
      setReportStatus("creating");
      try {
        setReportStatus("dispatching");
        const result = await runArjunPipeline({
          profile,
          voiceHints: params,
          fallbackCoords: userCoords,
        });

        if (!result.success || !result.report || !result.intel) {
          throw new Error(result.error || "ARJUN could not file the FIR");
        }

        setReportStatus("success");
        setActiveReport(result.report);
        onReportCreated(result.report);
        window.dispatchEvent(new CustomEvent("arjun-filed", { detail: result }));

        return JSON.stringify({
          success: true,
          report_id: result.report.id,
          dispatched_services: result.intel.services,
          word_document: result.wordFile,
          recipient: result.recipient,
          message: "ARJUN generated the accident Word report and routed Police 100 / Ambulance 108 / Fire 101 to the designated duty number.",
        });
      } catch (err) {
        setReportStatus("error");
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        return JSON.stringify({ success: false, error: msg });
      }
    },
  };

  // Start Built-in Native TARA Voice Engine
  const startNativeVoiceSession = useCallback(() => {
    setError("");
    setIsConnecting(false);
    setIsNativeListening(true);
    agentBus.setSession(true);

    const greeting = "Hello, this is TARA Emergency Response Agent. Please speak and describe the accident, location, and injuries.";
    agentBus.pushTurn("ai", greeting);
    setLastTranscript(`TARA: ${greeting}`);

    speakText(greeting, () => {
      // Start browser speech recognition
      const SpeechRecognitionConstructor =
        (window as unknown as { SpeechRecognition?: new () => WebkitSpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => WebkitSpeechRecognition }).webkitSpeechRecognition;

      if (SpeechRecognitionConstructor) {
        try {
          const rec = new SpeechRecognitionConstructor();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = "en-IN";

          rec.onresult = (event: WebkitSpeechRecognitionEvent) => {
            let interim = "";
            let final = "";
            for (let i = 0; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res.isFinal) {
                final += res[0].transcript + " ";
              } else {
                interim += res[0].transcript;
              }
            }
            const current = (final + interim).trim();
            if (current) {
              setLastTranscript(`You: ${current}`);
              setManualSpeechText(current);
              agentBus.pushTurn("user", current);
            }
          };

          rec.onerror = (e: { error: string }) => {
            console.warn("Native speech error:", e.error);
          };

          rec.onend = () => {
            // Keep listening if still in active state
          };

          rec.start();
          recognitionRef.current = rec;
        } catch (recErr) {
          console.warn("Speech recognition init error:", recErr);
        }
      }
    });
  }, [speakText]);

  const stopNativeVoiceSession = useCallback(() => {
    setIsNativeListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // cleanup
      }
      recognitionRef.current = null;
    }
    agentBus.setSession(false);
  }, []);

  const conversation = useConversation({
    clientTools,
    onConnect: () => {
      setIsConnecting(false);
      setError("");
      agentBus.setSession(true);
    },
    onDisconnect: () => {
      setIsConnecting(false);
      agentBus.setSession(false);
      void (async () => {
        if (agentBus.recentlyFiled()) return;
        if (agentBus.getUserSpeech().trim().length < 10) return;
        processAndSubmitReport();
      })();
    },
    onError: (errMsg) => {
      console.warn("ElevenLabs error, switching to built-in TARA Speech Engine:", errMsg);
      setIsConnecting(false);
      // Auto-fallback smoothly to built-in native voice engine without showing server error!
      startNativeVoiceSession();
    },
    onMessage: (msg) => {
      if (msg.message) {
        const source = msg.source === "user" ? "user" : "ai";
        agentBus.pushTurn(source, msg.message);
        setLastTranscript(`${source === "user" ? "You" : "TARA"}: ${msg.message}`);
      }
      setTimeout(() => {
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
      }, 100);
    },
  });

  const handleToggleCall = async () => {
    setError("");

    // If native listening is active, stop and submit
    if (isNativeListening) {
      stopNativeVoiceSession();
      if (manualSpeechText.trim() || agentBus.getUserSpeech().trim()) {
        await processAndSubmitReport(manualSpeechText || agentBus.getUserSpeech());
      }
      return;
    }

    // If ElevenLabs is connected, end session
    if (conversation.status === "connected") {
      await conversation.endSession();
      return;
    }

    // Try starting ElevenLabs if agent ID is set, or use Native Voice Engine
    if (ELEVENLABS_AGENT_ID) {
      setIsConnecting(true);
      try {
        await conversation.startSession({
          agentId: ELEVENLABS_AGENT_ID,
          clientTools,
        });
      } catch {
        // Auto-fallback smoothly to built-in engine
        setIsConnecting(false);
        startNativeVoiceSession();
      }
    } else {
      startNativeVoiceSession();
    }
  };

  const isElevenLabsActive = conversation.status === "connected";
  const isActive = isElevenLabsActive || isNativeListening;
  const isSpeaking = conversation.isSpeaking || isNativeSpeaking;

  return (
    <div className="flex flex-col items-center">
      {/* Status banners */}
      {reportStatus === "success" && activeReport && (
        <div className="w-full max-w-2xl mb-6 p-4 rounded-lg bg-gov-success-light border-2 border-gov-green animate-slide-up">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-gov-green flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-gov-green-dark text-base">SOS Report Registered Successfully</h3>
                <span className="text-xs font-bold px-2 py-0.5 bg-gov-green text-white rounded">
                  +₹500 Good Samaritan Reward
                </span>
              </div>
              <p className="text-sm text-gov-gray-dark mt-1">
                TARA voice report filed. Location locked, Word FIR generated, and routed to duty mobile.
              </p>

              <div className="mt-2 text-xs bg-white/80 p-2.5 rounded border border-gov-green/30 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gov-navy">Location:</span>
                  <span>{activeReport.location_text || "Coordinates on file"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gov-navy">Official Duty Dispatch:</span>
                  <span className="font-mono font-semibold text-gov-navy-dark">{OFFICIAL_PHONE}</span>
                  <span className="text-gov-green text-[11px] font-bold">✓ Alert Sent</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {activeReport.dispatched_services.map((svc) => {
                  const info = SERVICE_INFO[svc];
                  if (!info) return null;
                  return (
                    <span
                      key={svc}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                      style={{ backgroundColor: info.color }}
                    >
                      {info.label} ({info.number}) — Dispatched
                    </span>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gov-gray">
                <span>Report ID: #{activeReport.id.slice(0, 8).toUpperCase()}</span>
                <span>Active until officials accept</span>
              </div>
            </div>
            <button
              onClick={() => {
                setReportStatus("idle");
                setActiveReport(null);
              }}
              className="text-gov-gray hover:text-gov-gray-dark p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {reportStatus === "error" && (
        <div className="w-full max-w-2xl mb-6 p-4 rounded-lg bg-gov-error-light border-2 border-gov-error animate-slide-up">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-gov-error flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h3 className="font-bold text-gov-error">Report Submission Failed</h3>
              <p className="text-sm text-gov-gray-dark mt-1">{error}</p>
            </div>
            <button onClick={() => setReportStatus("idle")} className="text-gov-gray hover:text-gov-gray-dark">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* TARA Voice Agent — Circular */}
      <div className="relative flex flex-col items-center">
        {/* Outer pulsing rings when active */}
        {isActive && (
          <>
            <div className="absolute top-0 w-72 h-72 rounded-full border-2 border-gov-error/30 animate-pulse-ring" />
            <div className="absolute top-0 w-72 h-72 rounded-full border-2 border-gov-error/20 animate-pulse-ring-delayed" />
          </>
        )}

        {/* Main circle */}
        <button
          onClick={handleToggleCall}
          disabled={isConnecting || reportStatus === "creating" || reportStatus === "dispatching"}
          className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-300 group ${
            isActive
              ? isSpeaking
                ? "bg-gradient-to-br from-gov-error to-gov-error/80 shadow-2xl shadow-gov-error/40 scale-105"
                : "bg-gradient-to-br from-gov-navy to-gov-navy-dark shadow-2xl shadow-gov-navy/40 animate-pulse"
              : "bg-gradient-to-br from-gov-navy to-gov-navy-dark shadow-xl shadow-gov-navy/30 hover:shadow-2xl hover:scale-105"
          } ${isConnecting ? "animate-breathe" : ""} disabled:cursor-not-allowed disabled:opacity-70`}
          aria-label={isActive ? "End TARA call" : "Start TARA voice agent"}
        >
          {/* Decorative ring */}
          <div className="absolute inset-3 rounded-full border-2 border-white/20" />
          <div className="absolute inset-6 rounded-full border border-white/10" />

          {/* Chakra when idle */}
          {!isActive && !isConnecting && (
            <AshokaChakra className="absolute w-32 h-32 text-white/15 chakra-spin" />
          )}

          {/* Speaking waveform */}
          {isActive && (
            <div className="absolute inset-0 flex items-center justify-center gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-1.5 bg-white/80 rounded-full"
                  style={{
                    height: isSpeaking ? `${25 + Math.sin(i * 0.8) * 35}px` : "14px",
                    animation: `breathe ${0.5 + i * 0.1}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Center icon */}
          <div className="relative z-10 flex flex-col items-center">
            {isConnecting ? (
              <Loader2 size={48} className="text-white animate-spin" />
            ) : isActive ? (
              isSpeaking ? (
                <Volume2 size={48} className="text-white" />
              ) : (
                <Mic size={48} className="text-white animate-bounce" />
              )
            ) : (
              <Mic size={48} className="text-white group-hover:scale-110 transition-transform" />
            )}
            <span className="mt-3 text-white font-bold text-sm tracking-wide">
              {isConnecting ? "STARTING TARA..." : isActive ? (isSpeaking ? "TARA SPEAKING..." : "LISTENING (SPEAK NOW)") : "TAP TO TALK"}
            </span>
            <span className="mt-1 text-white/70 text-[10px] font-semibold">
              {isActive ? "Tap to submit report" : "TARA Voice Assistant"}
            </span>
          </div>
        </button>

        {/* Status indicators below circle */}
        <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
          {locationStatus === "granted" ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gov-success-light text-gov-green-dark text-xs font-medium">
              <MapPin size={12} /> Live GPS Active
            </span>
          ) : (
            <button
              onClick={requestLocation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gov-warning-light text-gov-warning text-xs font-medium hover:bg-gov-warning/20"
            >
              <MapPin size={12} /> Enable GPS Location
            </button>
          )}

          {isActive && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-extrabold border border-red-300 animate-pulse">
              <Radio size={12} className="animate-pulse" /> RECORDING VOICE
            </span>
          )}

          {reportStatus === "dispatching" && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gov-warning-light text-gov-warning text-xs font-medium">
              <Siren size={12} className="animate-bounce" /> Dispatching to Officials...
            </span>
          )}
        </div>

        {/* Live speech box when active */}
        {isActive && (
          <div className="mt-4 w-full max-w-lg p-4 bg-white rounded-xl border-2 border-gov-navy/30 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gov-navy flex items-center gap-1">
                <Sparkles size={14} className="text-amber-500" /> Live Spoken Input:
              </span>
              <button
                onClick={() => handleToggleCall()}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all shadow flex items-center gap-1"
              >
                <Send size={12} /> Done & Send SOS
              </button>
            </div>
            <p className="text-sm text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 min-h-[48px]">
              {lastTranscript || "Listening to your voice... Speak clearly into your microphone."}
            </p>
          </div>
        )}
      </div>

      {/* TARA description */}
      {!isActive && !isConnecting && reportStatus === "idle" && (
        <div className="mt-8 max-w-lg text-center">
          <h3 className="text-lg font-bold text-gov-navy-dark mb-1">Timely Assistance and Response Agent</h3>
          <p className="text-sm text-gov-gray leading-relaxed">
            Tap the microphone above and tell TARA what you witnessed (e.g. <em>"Car accident on Anna Salai with injuries"</em>).
            TARA will extract the incident, lock GPS location, and dispatch to official duty number <strong>{OFFICIAL_PHONE}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

export function TARA({ onReportCreated }: TARAProps) {
  return (
    <ConversationProvider>
      <TARAContent onReportCreated={onReportCreated} />
    </ConversationProvider>
  );
}
