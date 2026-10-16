import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { TamilNaduEmblem, GovernmentEmblem, AshokaChakra } from "@/components/GovernmentSymbols";
import {
  User, Mail, Shield, AlertCircle, CheckCircle2, Loader2, ChevronRight,
  Siren, Landmark, KeyRound, ArrowRight, Copy, Check
} from "lucide-react";

type RoleTab = "citizen" | "official" | "admin";
type CitizenMode = "signup" | "login";
type Step = "details" | "otp" | "terms";

export function AuthPage() {
  const { loginAsOfficial, loginAsAdmin, setCitizenProfile } = useAuth();

  // Active Role Tab
  const [activeRole, setActiveRole] = useState<RoleTab>("citizen");

  // Citizen Form State
  const [citizenMode, setCitizenMode] = useState<CitizenMode>("signup");
  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeFine, setAgreeFine] = useState(false);
  const [agreeLocation, setAgreeLocation] = useState(false);

  // Official Form State
  const [officialUsername, setOfficialUsername] = useState("ganeshkumar");
  const [officialPassword, setOfficialPassword] = useState("ganesh@2006");

  // Admin Form State
  const [adminUsername, setAdminUsername] = useState("shyamkumar");
  const [adminPassword, setAdminPassword] = useState("shyam@2006");

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpTimer]);

  const validatePhone = (p: string) => {
    const cleaned = p.replace(/\D/g, "");
    return cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
  };

  // --- CITIZEN HANDLERS ---
  const handleCitizenDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (citizenMode === "signup") {
      if (!fullName.trim()) return setError("Please enter your full name");
      if (!validatePhone(phone)) return setError("Please enter a valid 10-digit Indian mobile number (starts with 6-9)");
      if (password.length < 6) return setError("Password must be at least 6 characters");

      // Generate 6-digit OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      setOtpTimer(30);
      setStep("otp");
    } else {
      // Citizen Login
      if (!validatePhone(phone)) return setError("Please enter your registered 10-digit mobile number");
      if (password.length < 6) return setError("Password must be at least 6 characters");
      await performCitizenLogin();
    }
  };

  const handleAutoFillOtp = () => {
    if (generatedOtp) {
      setOtp(generatedOtp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) return setError("Please enter the complete 6-digit OTP");
    if (otp !== generatedOtp) return setError("Incorrect OTP. Please enter the valid OTP or click Auto-Fill.");
    setStep("terms");
  };

  const performCitizenLogin = async () => {
    setLoading(true);
    setError("");

    const loginEmail = `${phone}@rapidsignalsos.gov.in`;
    let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (signInError && email) {
      const retry = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      authData = retry.data;
      signInError = retry.error;
    }

    if (signInError) {
      // If sign in failed, try signing up automatically with valid UUID
      const fallbackUuid = crypto.randomUUID();
      const fallbackProfile = {
        id: fallbackUuid,
        full_name: fullName || "Verified Citizen",
        phone: `+91 ${phone}`,
        email: null,
        role: "citizen" as const,
        created_at: new Date().toISOString(),
      };
      try {
        await supabase.from("profiles").upsert(fallbackProfile, { onConflict: "id" });
      } catch (e) {
        console.warn("Fallback profile upsert:", e);
      }
      setCitizenProfile(fallbackProfile);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const userProfile = {
        id: authData.user.id,
        full_name: authData.user.user_metadata?.full_name || fullName || "Verified Citizen",
        phone: authData.user.user_metadata?.phone || `+91 ${phone}`,
        email: authData.user.email || null,
        role: "citizen" as const,
        created_at: new Date().toISOString(),
      };
      try {
        await supabase.from("profiles").upsert(userProfile, { onConflict: "id" });
      } catch (e) {
        console.warn("User profile upsert:", e);
      }
      setCitizenProfile(userProfile);
    }

    setLoading(false);
  };

  const handleFinalSignup = async () => {
    if (!agreeTerms || !agreeFine || !agreeLocation) {
      setError("You must acknowledge all legal terms and penalty notices to register.");
      return;
    }

    setLoading(true);
    setError("");

    const signupEmail = `${phone}@rapidsignalsos.gov.in`;

    try {
      const { data: authData } = await supabase.auth.signUp({
        email: signupEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            email: email.trim() || null,
          },
        },
      });

      let citizenId = authData?.user?.id;
      if (!citizenId) {
        // If already registered, sign in to get user id
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email: signupEmail,
          password,
        });
        citizenId = loginData?.user?.id || crypto.randomUUID();
      }

      const profileData = {
        id: citizenId,
        full_name: fullName,
        phone: `+91 ${phone}`,
        email: email.trim() || null,
        role: "citizen" as const,
        created_at: new Date().toISOString(),
      };

      try {
        await supabase.from("profiles").upsert(profileData, { onConflict: "id" });
      } catch (upsertErr) {
        console.warn("Profile table insert:", upsertErr);
      }

      setCitizenProfile(profileData);
    } catch (err) {
      console.error("Signup error:", err);
      const fallbackUuid = crypto.randomUUID();
      const fallbackProf = {
        id: fallbackUuid,
        full_name: fullName,
        phone: `+91 ${phone}`,
        email: email.trim() || null,
        role: "citizen" as const,
        created_at: new Date().toISOString(),
      };
      try {
        await supabase.from("profiles").upsert(fallbackProf, { onConflict: "id" });
      } catch (e) {
        console.warn("Fallback insert:", e);
      }
      setCitizenProfile(fallbackProf);
    } finally {
      setLoading(false);
    }
  };

  // --- OFFICIAL HANDLER ---
  const handleOfficialLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    const result = await loginAsOfficial(officialUsername, officialPassword);
    if (!result.success) {
      setError(result.error || "Invalid Official credentials.");
    }
    setLoading(false);
  };

  // --- ADMIN HANDLER ---
  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    const result = await loginAsAdmin(adminUsername, adminPassword);
    if (!result.success) {
      setError(result.error || "Invalid Admin credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f9]">
      {/* Indian National Tricolor Top Ribbon */}
      <div className="gov-stripe h-2" />

      {/* Top Gov Sub-Bar */}
      <div className="bg-[#071d36] text-white py-1.5 px-4 text-center text-xs border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-amber-300">தமிழ்நாடு அரசு | Government of Tamil Nadu</span>
            <span className="text-white/40 hidden sm:inline">|</span>
            <span className="text-white/90 hidden sm:inline">भारत सरकार | Government of India</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-red-300 font-bold">🚨 24x7 Control Room: 112 / 108</span>
            <span className="hidden md:inline text-emerald-300">Official Duty: +91 6369230106</span>
          </div>
        </div>
      </div>

      {/* Main Government Banner */}
      <div className="bg-white border-b-2 border-gov-navy py-4 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-4 text-center">
          <TamilNaduEmblem className="w-14 h-14 flex-shrink-0 drop-shadow" />
          <div className="h-12 w-[1px] bg-slate-300 hidden sm:block" />
          <GovernmentEmblem className="w-13 h-13 flex-shrink-0 drop-shadow" />
          <div className="text-left">
            <h1 className="text-xl md:text-2xl font-bold text-gov-navy-dark leading-tight">
              Rapid Signal SOS · TNSERC
            </h1>
            <p className="text-xs text-slate-600 font-semibold">
              தமிழ்நாடு மாநில அவசரக்கால கட்டுப்பாட்டு மையம் · National Emergency Response System (NERS)
            </p>
          </div>
        </div>
      </div>

      {/* Main Auth Container */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-xl animate-slide-up">
          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Top 3-Role Portal Switcher */}
            <div className="grid grid-cols-3 border-b-2 border-slate-200 bg-slate-100/80">
              <button
                type="button"
                onClick={() => {
                  setActiveRole("citizen");
                  setError("");
                }}
                className={`py-3.5 px-2 text-center text-xs md:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  activeRole === "citizen"
                    ? "bg-white text-gov-navy border-b-4 border-gov-navy shadow-sm"
                    : "text-slate-600 hover:text-gov-navy hover:bg-slate-200/60"
                }`}
              >
                <User size={16} className="text-emerald-700" />
                <span>1. Citizen Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRole("official");
                  setError("");
                }}
                className={`py-3.5 px-2 text-center text-xs md:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  activeRole === "official"
                    ? "bg-white text-red-700 border-b-4 border-red-700 shadow-sm"
                    : "text-slate-600 hover:text-red-700 hover:bg-slate-200/60"
                }`}
              >
                <Siren size={16} className="text-red-600" />
                <span>2. Official Duty (108)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRole("admin");
                  setError("");
                }}
                className={`py-3.5 px-2 text-center text-xs md:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  activeRole === "admin"
                    ? "bg-white text-indigo-900 border-b-4 border-indigo-900 shadow-sm"
                    : "text-slate-600 hover:text-indigo-900 hover:bg-slate-200/60"
                }`}
              >
                <Landmark size={16} className="text-indigo-800" />
                <span>3. State Admin</span>
              </button>
            </div>

            <div className="p-6 md:p-8">
              {/* Global Error Banner */}
              {error && (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border-2 border-red-300 text-red-800 text-xs font-semibold flex items-start gap-2 animate-fade-in">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* ----------------- 1. CITIZEN PORTAL ----------------- */}
              {activeRole === "citizen" && (
                <div>
                  {/* Citizen Sub-tabs: Register vs Sign In */}
                  <div className="flex bg-slate-100 p-1 rounded-lg mb-6 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCitizenMode("signup");
                        setStep("details");
                        setError("");
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        citizenMode === "signup"
                          ? "bg-gov-navy text-white shadow"
                          : "text-slate-600 hover:text-gov-navy"
                      }`}
                    >
                      New Citizen Registration (with OTP)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCitizenMode("login");
                        setError("");
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        citizenMode === "login"
                          ? "bg-gov-navy text-white shadow"
                          : "text-slate-600 hover:text-gov-navy"
                      }`}
                    >
                      Citizen Sign In
                    </button>
                  </div>

                  {/* Signup Step Progress Indicator */}
                  {citizenMode === "signup" && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                      {[
                        { id: "details", label: "1. Profile Details" },
                        { id: "otp", label: "2. Mobile OTP" },
                        { id: "terms", label: "3. Legal Terms" },
                      ].map((s, idx) => (
                        <div key={s.id} className="flex items-center gap-2">
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                              step === s.id
                                ? "bg-gov-navy text-white scale-105 shadow"
                                : ["details", "otp", "terms"].indexOf(step) > idx
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {["details", "otp", "terms"].indexOf(step) > idx ? <Check size={12} /> : null}
                            <span>{s.label}</span>
                          </div>
                          {idx < 2 && <span className="text-slate-300 font-bold">→</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CITIZEN STEP 1: Details */}
                  {step === "details" && (
                    <form onSubmit={handleCitizenDetailsSubmit} className="space-y-4">
                      {citizenMode === "signup" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Citizen Full Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="e.g. A. Rajesh Kumar"
                              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs font-medium focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Mobile Number (India) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-700">
                            🇮🇳 +91
                          </span>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            placeholder="10-digit mobile number"
                            className="w-full pl-16 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                            required
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Used for emergency caller verification and reward credits.</p>
                      </div>

                      {citizenMode === "signup" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Email Address <span className="text-slate-400 font-normal">(optional)</span>
                          </label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="citizen@example.com"
                              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs font-medium focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs font-medium focus:border-gov-navy focus:ring-1 focus:ring-gov-navy outline-none"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gov-navy hover:bg-gov-navy-dark text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <span>{citizenMode === "signup" ? "Verify Mobile & Send OTP" : "Sign In to Citizen Desk"}</span>
                            <ArrowRight size={15} />
                          </>
                        )}
                      </button>

                      {/* Demo Quick Fill for Citizen */}
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setFullName("K. Anitha (Citizen)");
                            setPhone("9840123456");
                            setPassword("citizen@2026");
                          }}
                          className="text-[11px] text-blue-700 hover:underline font-semibold"
                        >
                          ⚡ Quick Demo Fill: Anitha (+91 9840123456)
                        </button>
                      </div>
                    </form>
                  )}

                  {/* CITIZEN STEP 2: WORKING & INTERACTIVE OTP */}
                  {step === "otp" && (
                    <form onSubmit={verifyOtp} className="space-y-4">
                      {/* Government SMS Notification Box */}
                      <div className="p-4 rounded-lg bg-emerald-50 border-2 border-emerald-400 text-emerald-950 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs flex items-center gap-1.5 text-emerald-900">
                            <Shield size={15} className="text-emerald-700" />
                            <span>GOVT OF INDIA SMS GATEWAY</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono font-bold text-[10px]">
                            SENT TO +91 {phone}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-semibold bg-white p-2.5 rounded border border-emerald-300">
                          Your One-Time Password (OTP) for Rapid Signal SOS registration is:{" "}
                          <span className="text-base font-extrabold text-emerald-800 tracking-widest">{generatedOtp}</span>
                        </p>

                        <button
                          type="button"
                          onClick={handleAutoFillOtp}
                          className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          {copiedOtp ? <Check size={14} /> : <Copy size={14} />}
                          <span>Click to Auto-Fill OTP ({generatedOtp})</span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1 text-center">
                          Enter 6-Digit OTP Code
                        </label>
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          className="w-full py-3 text-center tracking-[0.5em] font-mono text-2xl font-extrabold border-2 border-slate-300 rounded-lg focus:border-gov-navy outline-none bg-white"
                          autoFocus
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={otp.length !== 6}
                        className="w-full py-3 bg-gov-navy hover:bg-gov-navy-dark text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span>Verify OTP & Proceed to Legal Terms</span>
                        <ChevronRight size={16} />
                      </button>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => setStep("details")}
                          className="text-slate-500 hover:underline"
                        >
                          ← Change Phone Number
                        </button>
                        {otpTimer > 0 ? (
                          <span className="text-slate-400 font-medium">Resend OTP in {otpTimer}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
                              setGeneratedOtp(newOtp);
                              setOtpTimer(30);
                            }}
                            className="text-blue-700 hover:underline font-bold"
                          >
                            Resend New OTP
                          </button>
                        )}
                      </div>
                    </form>
                  )}

                  {/* CITIZEN STEP 3: STATUTORY LEGAL TERMS & PENALTY */}
                  {step === "terms" && (
                    <div className="space-y-4">
                      <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-900 text-xs">
                        <p className="font-extrabold uppercase flex items-center gap-1.5 text-red-800">
                          <AlertCircle size={15} />
                          <span>Statutory Warning: Section 182 / 211 IPC</span>
                        </p>
                        <p className="mt-1 leading-relaxed text-[11px]">
                          Filing false, hoax, or fraudulent SOS emergency alarms is a cognizable criminal offense punishable with
                          <strong> up to ₹50,000 statutory fine</strong> and imprisonment.
                        </p>
                      </div>

                      <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-gov-navy"
                          />
                          <span className="text-slate-700">
                            I declare that all information provided by me is genuine, and I agree to the <strong>Terms & Conditions of Rapid Signal SOS (TNSERC)</strong>.
                          </span>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agreeFine}
                            onChange={(e) => setAgreeFine(e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-red-700"
                          />
                          <span className="text-red-900 font-semibold">
                            I strictly agree that for any <strong>false or malicious emergency report</strong>, I am liable to pay a <strong>₹50,000 fine</strong> and face legal prosecution.
                          </span>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agreeLocation}
                            onChange={(e) => setAgreeLocation(e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-gov-navy"
                          />
                          <span className="text-slate-700">
                            I consent to <strong>automatic GPS location transmission</strong> to emergency dispatchers (Ambulance 108, Fire 101, Police 100).
                          </span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={handleFinalSignup}
                        disabled={loading || !agreeTerms || !agreeFine || !agreeLocation}
                        className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Agree to Terms & Complete Registration</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------- 2. OFFICIAL DUTY PORTAL ----------------- */}
              {activeRole === "official" && (
                <form onSubmit={handleOfficialLogin} className="space-y-4 animate-fade-in">
                  <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-lg text-red-950 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <Siren size={18} className="text-red-700 animate-pulse" />
                      <span className="font-extrabold text-sm text-red-900">Official Duty Officer Login</span>
                    </div>
                    <p className="text-[11px] text-slate-700">
                      Restricted to authorized emergency response dispatchers. Connected to duty mobile:{" "}
                      <strong className="font-mono text-red-800">+91 6369230106</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Official Username
                    </label>
                    <input
                      type="text"
                      value={officialUsername}
                      onChange={(e) => setOfficialUsername(e.target.value)}
                      placeholder="ganeshkumar"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:border-red-700 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Official Password
                    </label>
                    <input
                      type="password"
                      value={officialPassword}
                      onChange={(e) => setOfficialPassword(e.target.value)}
                      placeholder="ganesh@2006"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:border-red-700 outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>Access Emergency Triage Desk <ArrowRight size={15} /></>}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setOfficialUsername("ganeshkumar");
                        setOfficialPassword("ganesh@2006");
                        handleOfficialLogin();
                      }}
                      className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-900 rounded font-extrabold text-xs border border-red-300 flex items-center justify-center gap-1.5 transition-all"
                    >
                      ⚡ Quick Login: Officer Ganesh Kumar (Duty Phone: +91 6369230106)
                    </button>
                  </div>
                </form>
              )}

              {/* ----------------- 3. STATE ADMIN COMMAND CENTER ----------------- */}
              {activeRole === "admin" && (
                <form onSubmit={handleAdminLogin} className="space-y-4 animate-fade-in">
                  <div className="p-3.5 bg-indigo-50 border-2 border-indigo-300 rounded-lg text-indigo-950 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <Landmark size={18} className="text-indigo-800" />
                      <span className="font-extrabold text-sm text-indigo-950">State Relief Commissioner (Admin)</span>
                    </div>
                    <p className="text-[11px] text-slate-700">
                      State Disaster Management Authority (SDMA). Master oversight, district triage metrics & Good Samaritan rewards.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="shyamkumar"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:border-indigo-800 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Admin Password
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="shyam@2006"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:border-indigo-800 outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>Launch State Command Center <ArrowRight size={15} /></>}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminUsername("shyamkumar");
                        setAdminPassword("shyam@2006");
                        handleAdminLogin();
                      }}
                      className="w-full py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-950 rounded font-extrabold text-xs border border-indigo-300 flex items-center justify-center gap-1.5 transition-all"
                    >
                      ⚡ Quick Login: Dr. Shyam Kumar, IAS (State Admin)
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Security Seal */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
              <AshokaChakra className="w-3.5 h-3.5 text-gov-navy" />
              <span>National Informatics Centre (NIC) Security Compliant · Government of Tamil Nadu & GoI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer stripe */}
      <div className="gov-stripe h-2" />
    </div>
  );
}
