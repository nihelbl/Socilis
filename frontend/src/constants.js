// Assets 
export const LOGO_URL        = "/logo socilis.webp";
export const MOBILIS_LOGO_URL = "/Mobilis_Logo.svg.png";

//  Design tokens partagés entre toutes les pages sans lui chaque fichier dever redefinir sa couleur la on centralise
export const COLORS = Object.freeze({
  green:    "#7FD832",
  cyan:     "#00c8ff",
  blueDark: "#040a12",
  navy:     "#020d1a",
});

// Navigation
export const NAV_ITEMS = [
  { label: "ATM Mobilis",          desc: "Telecom infrastructure security" },
  { label: "Mission & Objectives", desc: "Platform strategic goals"        },
  { label: "Models",               desc: "Threat detection & response"     },
  { label: "Platform Overview",    desc: "Socilis capabilities"            },
];

// IOC types (partagés Dashboard + ChatTopBar + iocDetector)
export const IOC_TYPE_META = Object.freeze({
  ip:     { color: "#22d3ee", icon: "IP",     symbol: "◈" },
  hash:   { color: "#a78bfa", icon: "HASH",   symbol: "⬡" },
  domain: { color: "#fb923c", icon: "DOMAIN", symbol: "◎" },
  url:    { color: "#4ade80", icon: "URL",     symbol: "⬔" },
  mail:   { color: "#f472b6", icon: "MAIL",   symbol: "✉" },
  cve:    { color: "#ef4444", icon: "CVE",    symbol: "⚠" },
});

// Threat level metadata (partagé Dashboard + ThreatReport + PDF export)
export const THREAT_META = Object.freeze({
  critical: { color: "#ef4444", label: "CRITICAL", bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.25)"  },
  high:     { color: "#f97316", label: "HIGH",    bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.25)" },
  medium:   { color: "#eab308", label: "MEDIAN",    bg: "rgba(234,179,8,0.07)",  border: "rgba(234,179,8,0.25)"  },
  low:      { color: "#22c55e", label: "LOW",   bg: "rgba(34,197,94,0.07)",  border: "rgba(34,197,94,0.25)"  },
  malicious:{ color: "#ef4444", label: "MALICIOUS",bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.25)"  },
  clean:    { color: "#22c55e", label: "CLEAN",   bg: "rgba(34,197,94,0.07)",  border: "rgba(34,197,94,0.25)"  },
});

// Helpers
/** Retourne la couleur d'un score de risque (0-100). */
export function scoreColor(score) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 35) return "#eab308";
  return "#22c55e";
}