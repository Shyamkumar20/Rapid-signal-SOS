export interface LockedLocation {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  address: string;
  mapsUrl: string;
  capturedAt: string;
}

function mapsUrl(lat: number, lng: number) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("geocode failed");
    const data = (await res.json()) as { display_name?: string };
    return data.display_name || `Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`;
  } catch {
    return `GPS ${lat.toFixed(6)}, ${lng.toFixed(6)} (address lookup unavailable)`;
  }
}

export async function lockExactLocation(
  fallback?: { lat: number; lng: number } | null
): Promise<LockedLocation | null> {
  const fromBrowser = await new Promise<GeolocationPosition | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 8000 }
    );
  });

  const lat = fromBrowser?.coords.latitude ?? fallback?.lat;
  const lng = fromBrowser?.coords.longitude ?? fallback?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const address = await reverseGeocode(lat, lng);
  return {
    lat,
    lng,
    accuracyMeters: fromBrowser?.coords.accuracy ?? null,
    address,
    mapsUrl: mapsUrl(lat, lng),
    capturedAt: new Date().toISOString(),
  };
}

export function formatLocationLine(loc: LockedLocation) {
  const acc = loc.accuracyMeters != null ? ` (±${Math.round(loc.accuracyMeters)}m)` : "";
  return `${loc.address} | ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}${acc}`;
}
