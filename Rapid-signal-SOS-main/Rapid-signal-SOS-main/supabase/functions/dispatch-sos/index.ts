import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OFFICIAL_PHONE = "+916369230106";

const SERVICE_MAP: Record<string, { type: string; number: string; label: string }> = {
  ambulance: { type: "ambulance", number: "108", label: "Ambulance (108)" },
  fire: { type: "fire", number: "101", label: "Fire Engine (101)" },
  police: { type: "police", number: "100", label: "Police (100)" },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      report_id,
      incident_type,
      description,
      location_text,
      latitude,
      longitude,
      severity,
      reporter_name,
      reporter_phone,
      services,
      cluster_count,
    } = await req.json();

    if (!report_id || !incident_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const servicesToDispatch: string[] = Array.isArray(services) ? services : ["police", "ambulance"];

    const locationLine = location_text
      ? `Location: ${location_text}`
      : `Lat: ${latitude ?? "N/A"}, Lng: ${longitude ?? "N/A"}`;

    const clusterLine = cluster_count > 1
      ? `[${cluster_count} witnesses reported this incident] `
      : "";

    const dispatchLogs: Array<{
      report_id: string;
      service_type: string;
      service_number: string;
      recipient_phone: string;
      message: string;
      status: string;
    }> = [];

    for (const svc of servicesToDispatch) {
      const info = SERVICE_MAP[svc];
      if (!info) continue;

      const message = `RAPID SIGNAL SOS ALERT
${info.label} dispatch requested.
Incident: ${incident_type}
Severity: ${severity?.toUpperCase() ?? "MEDIUM"}
${clusterLine}Reporter: ${reporter_name} (${reporter_phone})
${locationLine}
Details: ${description}
Report ID: ${report_id}
Please accept immediately.`;

      // In a production system, this would call an SMS gateway API.
      // For the hackathon demo, we log the dispatch and record it.
      console.log(`[DISPATCH] To ${OFFICIAL_PHONE} (${info.label}): ${message}`);

      dispatchLogs.push({
        report_id,
        service_type: info.type,
        service_number: info.number,
        recipient_phone: OFFICIAL_PHONE,
        message,
        status: "sent",
      });
    }

    const { error: logError } = await supabase
      .from("dispatch_logs")
      .insert(dispatchLogs);

    if (logError) {
      console.error("Failed to insert dispatch logs:", logError.message);
    }

    // Update the report's dispatched_services field
    const dispatchedNames = dispatchLogs.map((d) => d.service_type);
    await supabase
      .from("sos_reports")
      .update({ dispatched_services: JSON.stringify(dispatchedNames) })
      .eq("id", report_id);

    return new Response(
      JSON.stringify({
        success: true,
        dispatched: dispatchLogs.length,
        services: dispatchedNames,
        recipient: OFFICIAL_PHONE,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
