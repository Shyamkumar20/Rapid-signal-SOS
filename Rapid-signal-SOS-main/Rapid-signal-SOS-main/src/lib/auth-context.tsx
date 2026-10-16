import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  loginAsOfficial: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  switchRole: (role: UserRole) => void;
  setCitizenProfile: (prof: Profile) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const OFFICIAL_PROFILE: Profile = {
  id: "official-ganesh-kumar",
  full_name: "Inspector Ganesh Kumar",
  phone: "+91 6369230106",
  email: "ganesh.ers@tn.gov.in",
  role: "official",
  designation: "Emergency Duty Officer — Tamil Nadu State Emergency Response Centre (TNSERC)",
  badge_number: "TN-ERS-108-04",
  created_at: new Date().toISOString(),
};

const ADMIN_PROFILE: Profile = {
  id: "admin-shyam-kumar",
  full_name: "Dr. Shyam Kumar, IAS",
  phone: "+91 44 2859 3990",
  email: "shyam.ias@tn.gov.in",
  role: "admin",
  designation: "State Relief Commissioner & Director — State Disaster Management Authority (SDMA)",
  badge_number: "TN-IAS-COMM-01",
  created_at: new Date().toISOString(),
};

const DEFAULT_CITIZEN_PROFILE: Profile = {
  id: "c79f9021-3965-4f40-8b1e-0899bb123456",
  full_name: "K. Anitha (Citizen Reporter)",
  phone: "+91 9840123456",
  email: "anitha.citizen@rapidsignalsos.gov.in",
  role: "citizen",
  created_at: new Date().toISOString(),
};

const ROLE_STORAGE_KEY = "rapid_sos_user_role";
const PROFILE_STORAGE_KEY = "rapid_sos_custom_profile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>("citizen");
  const [loading, setLoading] = useState(true);

  const loadCitizenProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        setProfile({ ...data, role: "citizen" } as Profile);
        setRole("citizen");
        return;
      }

      // Fallback to user metadata
      const { data: userData } = await supabase.auth.getUser();
      const meta = userData?.user?.user_metadata;
      const fallbackProfile: Profile = {
        id: userId,
        full_name: meta?.full_name || "Citizen",
        phone: meta?.phone || "+91 9840123456",
        email: userData?.user?.email || null,
        role: "citizen",
        created_at: new Date().toISOString(),
      };

      try {
        await supabase.from("profiles").upsert(fallbackProfile, { onConflict: "id" });
      } catch (upsertErr) {
        console.warn("Profile auto-insert warning:", upsertErr);
      }

      setProfile(fallbackProfile);
      setRole("citizen");
    } catch (err) {
      console.error("Error loading profile:", err);
      setProfile({
        id: userId,
        full_name: "Citizen",
        phone: "+91 9840123456",
        email: null,
        role: "citizen",
        created_at: new Date().toISOString(),
      });
      setRole("citizen");
    }
  };

  const loginAsOfficial = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (username.trim().toLowerCase() === "ganeshkumar" && password === "ganesh@2006") {
      setProfile(OFFICIAL_PROFILE);
      setRole("official");
      setUser({ id: OFFICIAL_PROFILE.id, email: OFFICIAL_PROFILE.email! } as unknown as User);
      localStorage.setItem(ROLE_STORAGE_KEY, "official");
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(OFFICIAL_PROFILE));
      return { success: true };
    }
    return { success: false, error: "Invalid Official credentials. Please enter authorized username & password." };
  };

  const loginAsAdmin = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (username.trim().toLowerCase() === "shyamkumar" && password === "shyam@2006") {
      setProfile(ADMIN_PROFILE);
      setRole("admin");
      setUser({ id: ADMIN_PROFILE.id, email: ADMIN_PROFILE.email! } as unknown as User);
      localStorage.setItem(ROLE_STORAGE_KEY, "admin");
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(ADMIN_PROFILE));
      return { success: true };
    }
    return { success: false, error: "Invalid Admin credentials. Please enter authorized username & password." };
  };

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    if (newRole === "official") {
      setProfile(OFFICIAL_PROFILE);
      setUser({ id: OFFICIAL_PROFILE.id, email: OFFICIAL_PROFILE.email! } as unknown as User);
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(OFFICIAL_PROFILE));
    } else if (newRole === "admin") {
      setProfile(ADMIN_PROFILE);
      setUser({ id: ADMIN_PROFILE.id, email: ADMIN_PROFILE.email! } as unknown as User);
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(ADMIN_PROFILE));
    } else {
      const savedProf = localStorage.getItem(PROFILE_STORAGE_KEY);
      let parsed = DEFAULT_CITIZEN_PROFILE;
      try {
        if (savedProf) {
          const p = JSON.parse(savedProf);
          if (p.role === "citizen") parsed = p;
        }
      } catch {
        // fallback
      }
      setProfile(parsed);
      setUser({ id: parsed.id, email: parsed.email! } as unknown as User);
    }
  };

  const setCitizenProfile = (prof: Profile) => {
    const citizenProf: Profile = { ...prof, role: "citizen" };
    setProfile(citizenProf);
    setRole("citizen");
    setUser({ id: citizenProf.id, email: citizenProf.email! } as unknown as User);
    localStorage.setItem(ROLE_STORAGE_KEY, "citizen");
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(citizenProf));
  };

  const refreshProfile = async () => {
    if (role === "official") {
      setProfile(OFFICIAL_PROFILE);
    } else if (role === "admin") {
      setProfile(ADMIN_PROFILE);
    } else if (user) {
      await loadCitizenProfile(user.id);
    }
  };

  useEffect(() => {
    // Check for persisted official / admin roles
    const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;

    if (savedRole === "official") {
      setRole("official");
      setProfile(OFFICIAL_PROFILE);
      setUser({ id: OFFICIAL_PROFILE.id, email: OFFICIAL_PROFILE.email! } as unknown as User);
      setLoading(false);
      return;
    } else if (savedRole === "admin") {
      setRole("admin");
      setProfile(ADMIN_PROFILE);
      setUser({ id: ADMIN_PROFILE.id, email: ADMIN_PROFILE.email! } as unknown as User);
      setLoading(false);
      return;
    }

    // Default: Check Supabase session for citizen
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadCitizenProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        const activeSavedRole = localStorage.getItem(ROLE_STORAGE_KEY);
        if (activeSavedRole === "official" || activeSavedRole === "admin") {
          return;
        }
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await loadCitizenProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfile(null);
    setUser(null);
    setSession(null);
    setRole("citizen");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        loading,
        loginAsOfficial,
        loginAsAdmin,
        switchRole,
        setCitizenProfile,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
