import { IOC_TYPE_META, scoreColor } from "../../constants";
import ScoreRing                     from "./ScoreRing";
import VerdictBadge                  from "../chat/VerdictBadge";

function Field({ label, value, color, C }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "0.55rem", letterSpacing: "0.18em", color: C.textFaint, marginBottom: "4px", fontFamily: "'DM Mono', monospace" }}>
        {label}
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", color: color || C.text, wordBreak: "break-all", lineHeight: 1.6 }}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ C }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "14px" }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: C.textFaint }}>
        Select an IOC to see details
      </span>
    </div>
  );
}

export default function DetailPanel({ ioc, C }) {
  if (!ioc) return <EmptyState C={C} />;

  const tyM = IOC_TYPE_META[ioc.ioc_type] || { color: C.cyan, icon: "IOC", symbol: "◆" };
  const sc  = ioc.risk_score || 0;
  const scC = scoreColor(sc);

  return (
    <div style={{ padding: "24px", overflowY: "auto", height: "100%", scrollbarWidth: "thin", scrollbarColor: `${C.scrollThumb} transparent` }}>

      {/* Badges */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.15em", color: tyM.color, fontFamily: "'DM Mono', monospace", padding: "3px 10px", border: `1px solid ${tyM.color}35`, borderRadius: "4px", background: `${tyM.color}08` }}>
          {tyM.symbol} {tyM.icon}
        </span>
        <VerdictBadge verdict={ioc.final_verdict} />
      </div>

      {/* Indicateur */}
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", color: C.cyan, wordBreak: "break-all", lineHeight: 1.7, marginBottom: "20px", padding: "12px 14px", background: `${C.cyan}08`, borderLeft: `2px solid ${C.cyan}50`, borderRadius: "0 6px 6px 0" }}>
        {ioc.indicator}
      </div>

      {/* Score */}
      <div style={{ display: "flex", alignItems: "center", gap: "18px", padding: "16px", background: C.surface, border: `1px solid ${scC}20`, borderRadius: "10px", marginBottom: "20px" }}>
        <ScoreRing score={sc} size={68} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.55rem", letterSpacing: "0.18em", color: C.textFaint, marginBottom: "8px", fontFamily: "'DM Mono', monospace" }}>RISK SCORE</div>
          <div style={{ height: "4px", background: C.border, borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${sc}%`, background: `linear-gradient(90deg, ${scC}55, ${scC})`, borderRadius: "2px", transition: "width 0.8s ease" }} />
          </div>
          <div style={{ marginTop: "8px", fontFamily: "'Syne', sans-serif", fontSize: "1.4rem", fontWeight: 800, color: scC }}>
            {sc}<span style={{ fontSize: "0.7rem", fontFamily: "'DM Mono', monospace", color: C.textFaint, fontWeight: 400 }}>/100</span>
          </div>
        </div>
      </div>

      <Field C={C} label="VERDICT"        value={(ioc.final_verdict || "UNKNOWN").toUpperCase()} color={scC} />
      <Field C={C} label="ANALYSIS DATE" value={ioc.created_at?.slice(0, 16)} />

    </div>
  );
}