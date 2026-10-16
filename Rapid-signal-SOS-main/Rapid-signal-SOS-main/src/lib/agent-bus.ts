export type TaraTurn = {
  source: "user" | "ai";
  text: string;
  at: number;
};

export type VoiceSubmitPayload = {
  incident_type?: string;
  description?: string;
  location_text?: string;
  severity?: string;
  services?: string[];
};

type Listener = () => void;

class AgentBus {
  private turns: TaraTurn[] = [];
  private sessionActive = false;
  private coords: { lat: number; lng: number } | null = null;
  private lastFiledAt = 0;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  getTranscript(): TaraTurn[] {
    return this.turns;
  }

  getTranscriptText(): string {
    return this.turns
      .map((t) => `${t.source === "user" ? "Citizen" : "TARA"}: ${t.text}`)
      .join("\n");
  }

  getUserSpeech(): string {
    return this.turns
      .filter((t) => t.source === "user")
      .map((t) => t.text)
      .join(" ");
  }

  isSessionActive() {
    return this.sessionActive;
  }

  getCoords() {
    return this.coords;
  }

  pushTurn(source: TaraTurn["source"], text: string) {
    if (!text.trim()) return;
    this.turns.push({ source, text: text.trim(), at: Date.now() });
    if (this.turns.length > 80) this.turns = this.turns.slice(-80);
    this.notify();
  }

  setSession(active: boolean) {
    if (active && !this.sessionActive) {
      this.turns = [];
    }
    this.sessionActive = active;
    this.notify();
  }

  setCoords(coords: { lat: number; lng: number } | null) {
    this.coords = coords;
    this.notify();
  }

  markFiled() {
    this.lastFiledAt = Date.now();
  }

  recentlyFiled(ms = 25000) {
    return Date.now() - this.lastFiledAt < ms;
  }
}

export const agentBus = new AgentBus();
