export function AshokaChakra({ className = "", spinning = false }: { className?: string; spinning?: boolean }) {
  const spokes = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${spinning ? "chakra-spin" : ""}`}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
      {spokes.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x2 = 50 + 45 * Math.cos(rad);
        const y2 = 50 + 45 * Math.sin(rad);
        return (
          <line
            key={angle}
            x1="50"
            y1="50"
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}

export function TamilNaduEmblem({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {/* Outer gold & red concentric rings */}
      <circle cx="60" cy="60" r="57" fill="#fff" stroke="#990000" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="52" fill="none" stroke="#d4af37" strokeWidth="2" />
      <circle cx="60" cy="60" r="48" fill="#fdfbf7" />

      {/* Top Banner Text: தமிழ்நாடு அரசு */}
      <path id="tn-arc" d="M 22 60 A 38 38 0 0 1 98 60" fill="none" stroke="none" />
      <text fill="#8b0000" fontSize="7" fontWeight="bold" fontFamily="'Noto Sans Tamil', 'Noto Sans', sans-serif">
        <textPath href="#tn-arc" startOffset="50%" textAnchor="middle">
          தமிழ்நாடு அரசு
        </textPath>
      </text>

      {/* Temple Gopuram silhouette */}
      <g fill="#b8860b" stroke="#7a5800" strokeWidth="0.5">
        {/* Kalasam peaks */}
        <polygon points="58,28 60,24 62,28" />
        <polygon points="53,30 55,27 57,30" />
        <polygon points="63,30 65,27 67,30" />
        {/* Tier 1 (top) */}
        <polygon points="50,32 70,32 68,36 52,36" fill="#c99700" />
        {/* Tier 2 */}
        <polygon points="46,37 74,37 72,42 48,42" fill="#d4af37" />
        {/* Tier 3 */}
        <polygon points="42,43 78,43 76,49 44,49" fill="#c99700" />
        {/* Tier 4 (base) */}
        <polygon points="38,50 82,50 80,58 40,58" fill="#b8860b" />
        {/* Temple Gate archway */}
        <rect x="54" y="58" width="12" height="16" fill="#5c4033" />
        <path d="M 54 58 Q 60 52 66 58" fill="#5c4033" />
        {/* Flanking walls */}
        <rect x="42" y="58" width="12" height="16" fill="#8c6239" />
        <rect x="66" y="58" width="12" height="16" fill="#8c6239" />
      </g>

      {/* Ashoka Lion Base & Ribbon */}
      <rect x="36" y="74" width="48" height="5" rx="1" fill="#990000" />
      <text x="60" y="78" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="bold">
        GOVT OF TAMIL NADU
      </text>

      {/* Indian National Motto in Tamil: வாய்மையே வெல்லும் */}
      <path id="motto-arc" d="M 25 78 A 38 38 0 0 0 95 78" fill="none" stroke="none" />
      <text fill="#004d40" fontSize="5.5" fontWeight="bold" fontFamily="'Noto Sans Tamil', 'Noto Sans', sans-serif">
        <textPath href="#motto-arc" startOffset="50%" textAnchor="middle">
          வாய்மையே வெல்லும்
        </textPath>
      </text>
    </svg>
  );
}

export function GovernmentEmblem({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#fff" stroke="#1a4d8f" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="50" fill="#0d2d52" />
      <circle cx="60" cy="60" r="44" fill="#1a4d8f" />
      <g transform="translate(28, 28)">
        <AshokaChakra className="text-white w-16 h-16" />
      </g>
      <circle cx="60" cy="60" r="10" fill="#ffffff" />
      <circle cx="60" cy="60" r="4" fill="#1a4d8f" />
      <text x="60" y="108" textAnchor="middle" fill="#0d2d52" fontSize="7.5" fontWeight="800" fontFamily="'Noto Sans', sans-serif">
        सत्यमेव जयते
      </text>
    </svg>
  );
}

export function Emergency108Badge({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-700 text-white font-bold text-xs shadow-sm ${className}`}>
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      <span>108 TN-ERS Ambulance</span>
    </div>
  );
}
