import type { IncidentSeverity, ServiceType } from "@/lib/types";

export interface IncidentIntel {
  incidentType: string;
  severity: IncidentSeverity;
  services: ServiceType[];
  summary: string;
  casualtiesHint: string;
  vehiclesHint: string;
  fireHint: boolean;
  medicalHint: boolean;
  crimeHint: boolean;
  confidence: number;
  evidence: string[];
}

type WeightedTerm = { term: string; weight: number };

const TYPE_MODELS: Array<{
  label: string;
  terms: WeightedTerm[];
}> = [
  {
    label: "Road Traffic Accident",
    terms: [
      { term: "accident", weight: 3 },
      { term: "crash", weight: 4 },
      { term: "collision", weight: 4 },
      { term: "hit and run", weight: 5 },
      { term: "hit-and-run", weight: 5 },
      { term: "car", weight: 1.5 },
      { term: "bike", weight: 1.5 },
      { term: "motorcycle", weight: 2 },
      { term: "lorry", weight: 2 },
      { term: "truck", weight: 2 },
      { term: "bus", weight: 1.5 },
      { term: "auto", weight: 1 },
      { term: "scooty", weight: 1.5 },
      { term: "overturned", weight: 3 },
      { term: "head-on", weight: 4 },
      { term: "highway", weight: 1.5 },
      { term: "road", weight: 0.8 },
    ],
  },
  {
    label: "Fire Emergency",
    terms: [
      { term: "fire", weight: 5 },
      { term: "burning", weight: 4 },
      { term: "smoke", weight: 3 },
      { term: "blaze", weight: 4 },
      { term: "explosion", weight: 4 },
      { term: "gas leak", weight: 4 },
      { term: "building on fire", weight: 5 },
    ],
  },
  {
    label: "Medical Emergency",
    terms: [
      { term: "unconscious", weight: 4 },
      { term: "heart attack", weight: 5 },
      { term: "not breathing", weight: 5 },
      { term: "bleeding", weight: 3.5 },
      { term: "injured", weight: 3 },
      { term: "injury", weight: 3 },
      { term: "ambulance", weight: 2 },
      { term: "collapsed", weight: 3 },
      { term: "stroke", weight: 4 },
    ],
  },
  {
    label: "Crime / Assault",
    terms: [
      { term: "robbery", weight: 4 },
      { term: "stabbing", weight: 5 },
      { term: "assault", weight: 4 },
      { term: "fight", weight: 2 },
      { term: "gun", weight: 4 },
      { term: "shot", weight: 3 },
      { term: "theft", weight: 2 },
    ],
  },
];

const SEVERITY_CRITICAL: WeightedTerm[] = [
  { term: "dead", weight: 5 },
  { term: "death", weight: 5 },
  { term: "died", weight: 5 },
  { term: "killed", weight: 5 },
  { term: "fatal", weight: 5 },
  { term: "unconscious", weight: 4 },
  { term: "not breathing", weight: 5 },
  { term: "multiple vehicles", weight: 3 },
  { term: "pile up", weight: 4 },
  { term: "pile-up", weight: 4 },
  { term: "explosion", weight: 4 },
  { term: "trapped", weight: 4 },
  { term: "on fire", weight: 3.5 },
];

const SEVERITY_HIGH: WeightedTerm[] = [
  { term: "serious", weight: 3 },
  { term: "severe", weight: 3 },
  { term: "heavy bleeding", weight: 4 },
  { term: "broken", weight: 2 },
  { term: "head injury", weight: 4 },
  { term: "children", weight: 2.5 },
  { term: "pregnant", weight: 3 },
];

function scoreTerms(text: string, terms: WeightedTerm[]) {
  let score = 0;
  const hits: string[] = [];
  for (const { term, weight } of terms) {
    if (text.includes(term)) {
      score += weight;
      hits.push(term);
    }
  }
  return { score, hits };
}

function mapSeverity(raw?: string): IncidentSeverity | null {
  const v = (raw || "").toLowerCase();
  if (["low", "medium", "high", "critical"].includes(v)) return v as IncidentSeverity;
  return null;
}

function mapServices(raw?: string[]): ServiceType[] {
  if (!raw) return [];
  return raw.filter((s): s is ServiceType => ["ambulance", "fire", "police"].includes(s));
}

export function analyzeIncident(
  transcript: string,
  hints?: {
    incident_type?: string;
    description?: string;
    severity?: string;
    services?: string[];
  }
): IncidentIntel {
  const blob = `${hints?.incident_type || ""} ${hints?.description || ""} ${transcript}`.toLowerCase();
  const evidence: string[] = [];

  const typeScores = TYPE_MODELS.map((model) => {
    const { score, hits } = scoreTerms(blob, model.terms);
    return { label: model.label, score, hits };
  }).sort((a, b) => b.score - a.score);

  const top = typeScores[0];
  const incidentType =
    hints?.incident_type?.trim() ||
    (top.score >= 3 ? top.label : "Unclassified Emergency");
  if (top.hits.length) evidence.push(`Type signals: ${top.hits.slice(0, 6).join(", ")}`);

  const crit = scoreTerms(blob, SEVERITY_CRITICAL);
  const high = scoreTerms(blob, SEVERITY_HIGH);
  let severity: IncidentSeverity = mapSeverity(hints?.severity) || "medium";
  if (!mapSeverity(hints?.severity)) {
    if (crit.score >= 5) severity = "critical";
    else if (crit.score >= 3 || high.score >= 5) severity = "high";
    else if (high.score >= 2 || top.score >= 6) severity = "medium";
    else severity = "low";
  }
  if (crit.hits.length) evidence.push(`Critical signals: ${crit.hits.join(", ")}`);

  const fireHint = /fire|burning|smoke|blaze|explosion|gas leak/.test(blob);
  const medicalHint = /injur|bleed|unconscious|ambulance|hospital|heart|breath|collapsed/.test(blob);
  const crimeHint = /robbery|assault|stab|gun|theft|hit and run|hit-and-run/.test(blob);

  const services = new Set<ServiceType>(mapServices(hints?.services));
  if (medicalHint || top.label === "Road Traffic Accident" || top.label === "Medical Emergency") {
    services.add("ambulance");
  }
  if (fireHint || top.label === "Fire Emergency") services.add("fire");
  if (crimeHint || top.label === "Road Traffic Accident" || top.label === "Crime / Assault") {
    services.add("police");
  }
  if (services.size === 0) {
    services.add("police");
    services.add("ambulance");
  }

  const casualtiesHint = crit.hits.length
    ? `Possible serious harm indicated (${crit.hits.join(", ")}).`
    : medicalHint
      ? "Injuries indicated; medical response required."
      : "Casualty status not clearly stated.";

  const vehiclesHint = /car|bike|bus|truck|lorry|auto|scooty|motorcycle|vehicle/.test(blob)
    ? "Motor vehicle involvement detected from witness speech."
    : "Vehicle involvement not confirmed.";

  const userLines = transcript
    .split("\n")
    .filter((l) => l.startsWith("Citizen:"))
    .map((l) => l.replace(/^Citizen:\s*/, ""))
    .join(" ");

  const summary =
    hints?.description?.trim() ||
    (userLines
      ? `Trained agent summary: ${userLines.slice(0, 420)}`
      : "Emergency reported via TARA voice intake. Structured FIR generated by ARJUN.");

  const confidence = Math.min(
    99,
    Math.round(35 + Math.min(top.score, 12) * 4 + Math.min(crit.score + high.score, 8) * 2)
  );

  return {
    incidentType,
    severity,
    services: Array.from(services),
    summary,
    casualtiesHint,
    vehiclesHint,
    fireHint,
    medicalHint,
    crimeHint,
    confidence,
    evidence,
  };
}
