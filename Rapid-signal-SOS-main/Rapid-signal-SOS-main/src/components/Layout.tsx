import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AshokaChakra, GovernmentEmblem, TamilNaduEmblem } from "@/components/GovernmentSymbols";
import { LogOut, Menu, X, Phone, Siren, FileText, Award, Home, Shield, Activity, Radio } from "lucide-react";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const { profile, role, switchRole, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const citizenNavItems = [
    { id: "dashboard", label: "Emergency SOS", icon: Home },
    { id: "reports", label: "My Reports", icon: FileText },
    { id: "rewards", label: "Citizen Recognition", icon: Award },
  ];

  const officialNavItems = [
    { id: "official_triage", label: "Live Triage Console", icon: Siren },
    { id: "official_clusters", label: "Incident Clusters", icon: Activity },
    { id: "official_logs", label: "Dispatch SMS Logs (+91 6369230106)", icon: Radio },
  ];

  const adminNavItems = [
    { id: "admin_command", label: "Command Center", icon: Shield },
    { id: "admin_incidents", label: "State-wide Incidents", icon: Siren },
    { id: "admin_rewards", label: "Good Samaritan Rewards", icon: Award },
  ];

  const navItems = role === "official" ? officialNavItems : role === "admin" ? adminNavItems : citizenNavItems;

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* Indian National Tricolor stripe */}
      <div className="gov-stripe h-1.5" />

      {/* Live Role Switcher Banner (Instant Interconnection Tester) */}
      <div className="bg-[#0b2038] text-white text-xs py-2 px-4 border-b border-amber-500/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
              <Radio size={12} className="animate-pulse text-emerald-400" />
              <span>Interconnected Portal View:</span>
            </span>
          </div>

          {/* Quick One-Click Switcher Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => {
                switchRole("citizen");
                onNavigate("dashboard");
              }}
              className={`px-3 py-1 rounded text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                role === "citizen"
                  ? "bg-emerald-600 text-white shadow-md ring-1 ring-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>🇮🇳 1. Citizen Portal</span>
            </button>

            <button
              onClick={() => {
                switchRole("official");
                onNavigate("official_triage");
              }}
              className={`px-3 py-1 rounded text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                role === "official"
                  ? "bg-red-600 text-white shadow-md ring-1 ring-white animate-pulse"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>🚨 2. Official Duty (Ganesh)</span>
            </button>

            <button
              onClick={() => {
                switchRole("admin");
                onNavigate("admin_command");
              }}
              className={`px-3 py-1 rounded text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                role === "admin"
                  ? "bg-indigo-600 text-white shadow-md ring-1 ring-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span>🏛️ 3. State Admin (Dr. Shyam)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main header banner */}
      <div className="bg-white border-b-2 border-gov-navy">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TamilNaduEmblem className="w-12 h-12 flex-shrink-0 drop-shadow-sm" />
            <div className="h-10 w-[1px] bg-slate-300 hidden sm:block" />
            <GovernmentEmblem className="w-11 h-11 flex-shrink-0 drop-shadow-sm" />

            <div className="text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base md:text-xl font-bold text-gov-navy-dark leading-tight tracking-tight">
                  Rapid Signal SOS
                </h1>
                {role === "official" && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300">
                    🚨 OFFICIAL DISPATCH DESK (+91 6369230106)
                  </span>
                )}
                {role === "admin" && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-300">
                    🏛️ STATE COMMAND CENTER (ADMIN)
                  </span>
                )}
                {role === "citizen" && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 hidden sm:inline-block">
                    🇮🇳 CITIZEN PORTAL
                  </span>
                )}
              </div>
              <p className="text-[10px] md:text-xs text-slate-600 font-medium leading-tight">
                தமிழ்நாடு மாநில அவசரக்கால செயல்பாட்டு மையம் · National Emergency Response System (NERS)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden md:flex items-center gap-2.5 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                  role === "admin" ? "bg-indigo-700" : role === "official" ? "bg-red-700" : "bg-gov-navy"
                }`}>
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gov-navy-dark leading-tight">{profile.full_name}</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">
                    {profile.designation || profile.phone}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-gov-navy"
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Navigation bar */}
        <nav className="bg-gov-navy text-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="hidden md:flex items-center gap-1 h-11">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold transition-colors rounded-t-md ${
                      isActive
                        ? "bg-white text-gov-navy shadow-inner"
                        : "text-white/90 hover:bg-gov-navy-light hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/90 hover:text-white bg-red-600/80 hover:bg-red-600 transition-colors rounded"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
              <div className="md:hidden flex flex-col py-2 border-t border-white/10 animate-fade-in">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        currentPage === item.id
                          ? "bg-white text-gov-navy font-bold"
                          : "text-white hover:bg-gov-navy-light"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    signOut();
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-800 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto">
      <div className="gov-stripe h-1.5" />
      <div className="bg-[#071d36] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <TamilNaduEmblem className="w-10 h-10" />
                <GovernmentEmblem className="w-10 h-10" />
                <div>
                  <h3 className="font-bold text-base text-white">Rapid Signal SOS · TNSERC</h3>
                  <p className="text-xs text-amber-300 font-medium">
                    தமிழ்நாடு அரசு & இந்திய அரசு · Government of Tamil Nadu & GoI
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/80 leading-relaxed max-w-md">
                State Emergency Response Centre (TNSERC) integrated with National Emergency Response System (NERS) & TARA AI Agent.
                Instant voice-enabled triage, multi-witness accident merging, and Good Samaritan Citizen Recognition.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
                <AshokaChakra className="w-4 h-4 text-amber-400 chakra-spin" />
                <span>வாய்மையே வெல்லும் · सत्यमेव जयते · Truth Alone Triumphs</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3 text-amber-300 border-b border-white/10 pb-1">Emergency Numbers (24x7)</h4>
              <ul className="space-y-1.5 text-xs text-white/90">
                <li className="flex items-center gap-2 font-medium"><Phone size={12} className="text-red-400" /> National Emergency: 112</li>
                <li className="flex items-center gap-2 font-medium"><Phone size={12} className="text-red-400" /> Ambulance: 108</li>
                <li className="flex items-center gap-2 font-medium"><Phone size={12} className="text-orange-400" /> Fire & Rescue: 101</li>
                <li className="flex items-center gap-2 font-medium"><Phone size={12} className="text-blue-400" /> Police Control: 100</li>
                <li className="flex items-center gap-2 font-medium"><Phone size={12} className="text-yellow-400" /> Disaster Helpline: 1090</li>
                <li className="flex items-center gap-2 text-[11px] text-emerald-300 font-semibold mt-1">
                  🚨 Official Duty Line: +91 6369230106
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3 text-amber-300 border-b border-white/10 pb-1">Statutory Guidelines</h4>
              <ul className="space-y-1.5 text-xs text-white/80">
                <li>Good Samaritan Protection Act 2016</li>
                <li>MoRTH Scheme for Bystanders (₹5,000 Award)</li>
                <li>False Alarm Penalty: Section 182 / 211 IPC</li>
                <li>TN State Disaster Management Authority</li>
                <li>Data Protection & Privacy Policy</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/15 mt-6 pt-4 text-center text-[11px] text-white/60">
            <p>© 2026 Government of Tamil Nadu & Government of India. National Emergency Response Division.</p>
            <p className="mt-0.5 text-white/40">Demonstration Project for Hackathon · All Emergency Services Interconnected</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
