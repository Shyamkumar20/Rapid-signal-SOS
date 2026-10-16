export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type ReportStatus = "pending" | "accepted" | "resolved";
export type ServiceType = "ambulance" | "fire" | "police";

export type UserRole = "citizen" | "official" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role?: UserRole;
  designation?: string;
  badge_number?: string;
  created_at: string;
}

export const OFFICIAL_PHONE = "+91 6369230106";

export interface SosReport {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reporter_phone: string;
  incident_type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  location_text: string;
  district?: string;
  severity: IncidentSeverity;
  dispatched_services: ServiceType[];
  assigned_unit?: string;
  cluster_id: string | null;
  cluster_count?: number;
  status: ReportStatus;
  is_false_report?: boolean;
  fine_amount?: number;
  official_notes?: string;
  created_at: string;
}

export interface DispatchLog {
  id: string;
  report_id: string;
  service_type: string;
  service_number: string;
  recipient_phone: string;
  message: string;
  status: "sent" | "failed" | "accepted";
  sent_at: string;
}

export interface Reward {
  id: string;
  user_id: string;
  report_id: string;
  title: string;
  description: string;
  amount: number;
  status: "pending" | "awarded";
  awarded_at: string | null;
  created_at: string;
}

export const SERVICE_INFO: Record<ServiceType, { label: string; number: string; color: string }> = {
  ambulance: { label: "Ambulance", number: "108", color: "#c81e1e" },
  fire: { label: "Fire Engine", number: "101", color: "#e67e22" },
  police: { label: "Police", number: "100", color: "#1a4d8f" },
};

export const SEVERITY_INFO: Record<IncidentSeverity, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "#155724", bg: "#d4edda" },
  medium: { label: "Medium", color: "#856404", bg: "#fff3cd" },
  high: { label: "High", color: "#721c24", bg: "#f8d7da" },
  critical: { label: "Critical", color: "#fff", bg: "#c81e1e" },
};
