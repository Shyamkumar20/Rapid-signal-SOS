import type { SosReport } from "@/lib/types";
import { OFFICIAL_PHONE, SERVICE_INFO } from "@/lib/types";
import type { IncidentIntel } from "@/lib/incident-intel";
import type { LockedLocation } from "@/lib/location-lock";

export async function buildAccidentWordBlob(input: {
  report: SosReport;
  intel: IncidentIntel;
  location: LockedLocation | null;
  transcript: string;
}): Promise<Blob> {
  const { report, intel, location, transcript } = input;
  const services = report.dispatched_services
    .map((s) => {
      const info = SERVICE_INFO[s];
      return info ? `${info.label} (${info.number})` : s;
    })
    .join(", ");

  const maps = location?.mapsUrl || (report.latitude && report.longitude
    ? `https://maps.google.com/?q=${report.latitude},${report.longitude}`
    : "Not available");

  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Official Accident FIR Report</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; margin: 40px; color: #111827; }
        .header { text-align: center; border-bottom: 3px solid #FF9933; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { color: #0D2D52; font-size: 20px; margin: 0; }
        .header h2 { color: #374151; font-size: 14px; margin: 4px 0 0 0; font-style: italic; }
        .title { text-align: center; font-size: 18px; font-weight: bold; color: #0D2D52; margin: 20px 0 5px 0; }
        .meta { text-align: center; font-size: 12px; color: #6B7280; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { border: 1px solid #D1D5DB; padding: 8px 12px; font-size: 13px; text-align: left; }
        th { background-color: #F3F4F6; color: #4B5563; font-weight: bold; width: 25%; }
        .section-title { font-size: 14px; font-weight: bold; color: #0D2D52; margin: 16px 0 6px 0; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
        .narrative { background-color: #F9FAFB; border: 1px solid #E5E7EB; padding: 12px; border-radius: 4px; font-size: 13px; line-height: 1.5; }
        .footer { margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 11px; color: #6B7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>GOVERNMENT OF TAMIL NADU & GOVERNMENT OF INDIA</h1>
        <h2>National Emergency Response System (NERS) · TNSERC Live Incident Report</h2>
      </div>

      <div class="title">OFFICIAL ACCIDENT / EMERGENCY FIRST INFORMATION REPORT</div>
      <div class="meta">Report Reference ID: #${report.id.slice(0, 8).toUpperCase()} | Timestamp: ${new Date(report.created_at).toLocaleString("en-IN")}</div>

      <table>
        <tr>
          <th>Incident Type</th>
          <td><strong>${intel.incidentType}</strong></td>
          <th>Severity</th>
          <td><strong style="color: #DC2626;">${intel.severity.toUpperCase()}</strong></td>
        </tr>
        <tr>
          <th>Reporter</th>
          <td>${report.reporter_name} (${report.reporter_phone})</td>
          <th>Status</th>
          <td><strong>${report.status.toUpperCase()}</strong></td>
        </tr>
        <tr>
          <th>Services Dispatched</th>
          <td>${services}</td>
          <th>Confidence Score</th>
          <td>${intel.confidence}%</td>
        </tr>
        <tr>
          <th>Location</th>
          <td>${location?.address || report.location_text}</td>
          <th>Coordinates</th>
          <td>${location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : report.latitude ? `${report.latitude}, ${report.longitude}` : "Pending"}</td>
        </tr>
      </table>

      <div class="section-title">1. Narrative Assessment</div>
      <div class="narrative">${intel.summary}</div>

      <div class="section-title">2. Harm & Scene Analysis</div>
      <p style="font-size: 13px; line-height: 1.6;">
        <strong>Casualties / Injuries:</strong> ${intel.casualtiesHint}<br>
        <strong>Vehicles Involved:</strong> ${intel.vehiclesHint}<br>
        <strong>Emergency Response Units:</strong> ${intel.fireHint ? "Fire 101 Dispatched | " : ""}${intel.medicalHint ? "Ambulance 108 Dispatched | " : ""}${intel.crimeHint ? "Police 100 Dispatched" : "Police Notified"}
      </p>

      <div class="section-title">3. Official Dispatch Notification</div>
      <p style="font-size: 13px;">
        Dispatched automatically to Designated Official Duty Mobile: <strong>${OFFICIAL_PHONE}</strong>.<br>
        Live Map Link: <a href="${maps}">${maps}</a>
      </p>

      <div class="section-title">4. Voice Intelligence Transcript</div>
      <div class="narrative" style="font-family: monospace;">${transcript.trim() || "Transcript processed from structured voice tool payload."}</div>

      <div class="footer">
        Confidential Emergency Dispatch Document · Tamil Nadu State Emergency Response Centre (TNSERC) · Duty Officer: +91 6369230106
      </div>
    </body>
    </html>
  `;

  return new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
}

export async function downloadAccidentWord(input: {
  report: SosReport;
  intel: IncidentIntel;
  location: LockedLocation | null;
  transcript: string;
}) {
  const blob = await buildAccidentWordBlob(input);
  const name = `ARJUN-FIR-${input.report.id.slice(0, 8).toUpperCase()}.doc`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return name;
}
