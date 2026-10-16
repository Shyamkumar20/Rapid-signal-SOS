import { supabase } from "@/lib/supabase";
import type { SosReport, DispatchLog, Reward } from "@/lib/types";

const REPORTS_KEY = "rapid_sos_shared_reports";
const LOGS_KEY = "rapid_sos_shared_logs";
const REWARDS_KEY = "rapid_sos_shared_rewards";

type StoreListener = () => void;

class EmergencyStore {
  private listeners = new Set<StoreListener>();
  private broadcast: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcast = new BroadcastChannel("rapid_sos_channel");
        this.broadcast.onmessage = () => {
          this.notify();
        };
      } catch {
        // Fallback
      }
    }
  }

  subscribe(fn: StoreListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  private postSync() {
    this.notify();
    if (this.broadcast) {
      try {
        this.broadcast.postMessage({ type: "SYNC", timestamp: Date.now() });
      } catch {
        // Broadcast fallback
      }
    }
  }

  // --- SOS REPORTS ---
  getLocalReports(): SosReport[] {
    try {
      const data = localStorage.getItem(REPORTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async getAllReports(): Promise<SosReport[]> {
    const local = this.getLocalReports();
    let dbReports: SosReport[] = [];

    try {
      const { data, error } = await supabase
        .from("sos_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        dbReports = data as unknown as SosReport[];
      }
    } catch (e) {
      console.warn("Error fetching Supabase reports:", e);
    }

    // Merge by ID (local has latest optimistic status)
    const map = new Map<string, SosReport>();
    dbReports.forEach((r) => map.set(r.id, r));
    local.forEach((r) => {
      const existing = map.get(r.id);
      if (existing) {
        map.set(r.id, { ...existing, ...r });
      } else {
        map.set(r.id, r);
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Calculate cluster counts
    const clusterCounts: Record<string, number> = {};
    merged.forEach((r) => {
      if (r.cluster_id) clusterCounts[r.cluster_id] = (clusterCounts[r.cluster_id] || 0) + 1;
    });
    merged.forEach((r) => {
      if (r.cluster_id) r.cluster_count = clusterCounts[r.cluster_id] || 1;
    });

    return merged;
  }

  async saveReport(report: SosReport): Promise<void> {
    // 1. Save to local storage
    const local = this.getLocalReports();
    const idx = local.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...report };
    } else {
      local.unshift(report);
    }
    localStorage.setItem(REPORTS_KEY, JSON.stringify(local));

    // 2. Sync to Supabase
    try {
      await supabase.from("sos_reports").upsert(report, { onConflict: "id" });
    } catch (err) {
      console.warn("Supabase report upsert warning:", err);
    }

    this.postSync();
  }

  async updateReportStatus(
    reportId: string,
    status: "accepted" | "resolved",
    assignedUnit?: string,
    notes?: string
  ): Promise<void> {
    // 1. Update local
    const local = this.getLocalReports();
    const target = local.find((r) => r.id === reportId);
    if (target) {
      target.status = status;
      if (assignedUnit) target.assigned_unit = assignedUnit;
      if (notes) target.official_notes = notes;
      localStorage.setItem(REPORTS_KEY, JSON.stringify(local));
    }

    // 2. Also update reward status to awarded
    const rewards = this.getLocalRewards();
    const rew = rewards.find((rw) => rw.report_id === reportId);
    if (rew) {
      rew.status = "awarded";
      rew.awarded_at = new Date().toISOString();
      localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
    }

    // 3. Update Supabase
    try {
      await supabase
        .from("sos_reports")
        .update({
          status,
          assigned_unit: assignedUnit || "TN-108-EMR-204",
          official_notes: notes || "Dispatched by Official Duty Officer Ganesh Kumar",
        })
        .eq("id", reportId);

      await supabase
        .from("rewards")
        .update({
          status: "awarded",
          awarded_at: new Date().toISOString(),
        })
        .eq("report_id", reportId);
    } catch (err) {
      console.warn("Supabase report status update warning:", err);
    }

    this.postSync();
  }

  // --- REWARDS ---
  getLocalRewards(): Reward[] {
    try {
      const data = localStorage.getItem(REWARDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async getAllRewards(userId?: string): Promise<Reward[]> {
    const local = this.getLocalRewards();
    let dbRewards: Reward[] = [];

    try {
      let query = supabase.from("rewards").select("*");
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error && data) {
        dbRewards = data as unknown as Reward[];
      }
    } catch (e) {
      console.warn("Error fetching Supabase rewards:", e);
    }

    const map = new Map<string, Reward>();
    dbRewards.forEach((r) => map.set(r.id, r));
    local.forEach((r) => {
      const existing = map.get(r.id);
      if (existing) {
        map.set(r.id, { ...existing, ...r });
      } else {
        map.set(r.id, r);
      }
    });

    let merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (userId) {
      merged = merged.filter((r) => r.user_id === userId || !r.user_id);
    }

    return merged;
  }

  async saveReward(reward: Reward): Promise<void> {
    const local = this.getLocalRewards();
    const idx = local.findIndex((r) => r.id === reward.id);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...reward };
    } else {
      local.unshift(reward);
    }
    localStorage.setItem(REWARDS_KEY, JSON.stringify(local));

    try {
      await supabase.from("rewards").upsert(reward, { onConflict: "id" });
    } catch (err) {
      console.warn("Supabase reward upsert warning:", err);
    }

    this.postSync();
  }

  async approveReward(rewardId: string, amount?: number): Promise<void> {
    const local = this.getLocalRewards();
    const target = local.find((r) => r.id === rewardId);
    if (target) {
      target.status = "awarded";
      target.awarded_at = new Date().toISOString();
      if (amount) target.amount = amount;
      localStorage.setItem(REWARDS_KEY, JSON.stringify(local));
    }

    try {
      const updateData: Partial<Reward> = {
        status: "awarded",
        awarded_at: new Date().toISOString(),
      };
      if (amount) updateData.amount = amount;

      await supabase.from("rewards").update(updateData).eq("id", rewardId);
    } catch (err) {
      console.warn("Supabase reward approve warning:", err);
    }

    this.postSync();
  }

  // --- DISPATCH LOGS ---
  getLocalLogs(): DispatchLog[] {
    try {
      const data = localStorage.getItem(LOGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async getAllLogs(): Promise<DispatchLog[]> {
    const local = this.getLocalLogs();
    let dbLogs: DispatchLog[] = [];

    try {
      const { data, error } = await supabase
        .from("dispatch_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        dbLogs = data as unknown as DispatchLog[];
      }
    } catch (e) {
      console.warn("Error fetching Supabase logs:", e);
    }

    const map = new Map<string, DispatchLog>();
    dbLogs.forEach((l) => map.set(l.id, l));
    local.forEach((l) => map.set(l.id, l));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );
  }

  async saveLog(log: DispatchLog): Promise<void> {
    const local = this.getLocalLogs();
    local.unshift(log);
    if (local.length > 50) local.pop();
    localStorage.setItem(LOGS_KEY, JSON.stringify(local));

    try {
      await supabase.from("dispatch_logs").insert(log);
    } catch (err) {
      console.warn("Supabase log insert warning:", err);
    }

    this.postSync();
  }
}

export const emergencyStore = new EmergencyStore();
