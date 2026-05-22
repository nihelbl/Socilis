import { memo }                           from "react";
import { t }                              from "./chatTheme";
import VerdictBadge                       from "./VerdictBadge";
import { dlCSV, dlJSON, dlPDF }           from "../../utils/exportUtils";
import { IOC_TYPE_META, scoreColor }      from "../../constants";

// ── ReportCard ────────────────────────────────────────────────────────────────
function ReportCard({ report, darkMode }) {
  const th       = t(darkMode);
  const sc       = report.score || 0;
  const scColor  = scoreColor(sc);                              // ← depuis constants
  const tyM      = IOC_TYPE_META[report.type] || { color: "#00a8ff", symbol: "◆", icon: "IOC" }; // ← depuis constants

  const Field = ({ label, value, color, mono }) => (
    <div style={{ marginBottom:"8px" }}>
      <div style={{ fontSize:"8px", letterSpacing:"2px", color:th.textFaint, marginBottom:"2px" }}>{label}</div>
      <div style={{ fontSize:"10px", color:color||th.text, fontFamily:mono?"'JetBrains Mono',monospace":"inherit", wordBreak:"break-all", lineHeight:"1.5" }}>{value}</div>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={{ marginBottom:"14px", paddingTop:"12px", borderTop:`1px solid ${th.border}` }}>
      <div style={{ fontSize:"8px", letterSpacing:"3px", color:th.textFaint, marginBottom:"10px" }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{
      background: darkMode ? "rgba(4,12,24,0.97)" : "rgba(245,250,255,0.98)",
      border: `1px solid ${th.borderActive}`,
      borderRadius: "10px", padding: "16px 18px", marginTop: "10px",
      fontSize: "11px", fontFamily: "'JetBrains Mono', monospace",
      boxShadow: "0 4px 24px rgba(0,168,255,0.08)",
    }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"14px", paddingBottom:"12px", borderBottom:`1px solid ${th.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ display:"inline-block", width:"6px", height:"6px", borderRadius:"50%", background:th.accent, boxShadow:`0 0 6px ${th.accent}` }}/>
          <span style={{ color:th.accent, fontWeight:"700", letterSpacing:"2px", fontSize:"10px" }}>THREAT INTELLIGENCE REPORT</span>
        </div>
        <div style={{ display:"flex", gap:"5px" }}>
          {[
            { label:"CSV",  action: () => dlCSV(report)  },
            { label:"JSON", action: () => dlJSON(report) },
            { label:"PDF",  action: () => dlPDF(report)  },
          ].map(({ label, action }) => (
            <button key={label} onClick={action} style={{
              background:"transparent", border:`1px solid ${th.border}`,
              color:th.textMuted, padding:"3px 9px", borderRadius:"4px",
              fontSize:"8px", cursor:"pointer", letterSpacing:"1.5px",
              fontFamily:"'JetBrains Mono',monospace", transition:"all 0.2s",
            }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=th.borderActive; e.currentTarget.style.color=th.accent; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=th.border;       e.currentTarget.style.color=th.textMuted; }}
            >↓ {label}</button>
          ))}
        </div>
      </div>

      {/* ── IOC + Type ── */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
        <span style={{ color:tyM.color, fontSize:"14px" }}>{tyM.symbol}</span>
        <span style={{ fontSize:"8px", letterSpacing:"2px", color:tyM.color }}>{(report.type||"").toUpperCase()}</span>
        <span style={{ color:th.accent, background:th.accentSubtle, border:`1px solid ${th.border}`, padding:"2px 10px", borderRadius:"3px", fontSize:"11px", wordBreak:"break-all" }}>{report.ioc}</span>
      </div>

      {/* ── Score + Verdict ── */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px" }}>
        <VerdictBadge verdict={report.verdict}/>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
            <span style={{ color:th.textFaint, fontSize:"9px", letterSpacing:"2px" }}>THREAT SCORE</span>
            <span style={{ color:scColor, fontWeight:"700", fontSize:"13px" }}>{sc}<span style={{ color:th.textFaint, fontSize:"9px" }}>/100</span></span>
          </div>
          <div style={{ height:"3px", background:"rgba(255,255,255,0.06)", borderRadius:"2px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${sc}%`, background:`linear-gradient(90deg,${scColor}88,${scColor})`, borderRadius:"2px", boxShadow:`0 0 8px ${scColor}60`, transition:"width 1.2s cubic-bezier(0.4,0,0.2,1)" }}/>
          </div>
        </div>
      </div>

      {/* ── Tags ── */}
      {(report.tags||[]).length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"12px" }}>
          {report.tags.map(tag => (
            <span key={tag} style={{ fontSize:"9px", padding:"2px 9px", background:"rgba(0,168,255,0.07)", border:"1px solid rgba(0,168,255,0.2)", borderRadius:"3px", color:"#00a8ff" }}>{tag}</span>
          ))}
        </div>
      )}

      {/* ══════════ SECTIONS PAR TYPE ══════════ */}

      {/* IP */}
      {report.type === "ip" && (<>
        <Section title="NETWORK INFORMATION">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <Field label="ISP"  value={report.isp  || "N/A"}/>
            <Field label="ASN"  value={report.asn  || "N/A"}/>
            <Field label="COUNTRY" value={report.country || "N/A"}/>
          </div>
        </Section>
        <Section title="REPUTATION">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <Field label="VT MALICIOUS"    value={report.vt_malicious  ?? 0} color={report.vt_malicious  > 0 ? "#ef4444" : "#22c55e"}/>
            <Field label="VT SUSPICIOUS"   value={report.vt_suspicious ?? 0} color={report.vt_suspicious > 0 ? "#eab308" : "#22c55e"}/>
            <Field label="ABUSEIPDB SCORE" value={report.abuseipdb     ?? 0} color={report.abuseipdb     > 0 ? "#f97316" : "#22c55e"}/>
            <Field label="OTX PULSES"      value={report.otx_pulses    ?? 0}/>
            {report.vt_reputation != null && (
              <Field label="VT REPUTATION" value={report.vt_reputation} color={report.vt_reputation < 0 ? "#ef4444" : "#22c55e"}/>
            )}
          </div>
        </Section>
        {(report.vt_tags||[]).length > 0 && (
          <Section title="VIRUSTOTAL TAGS">
            <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>
              {report.vt_tags.map(tag => (
                <span key={tag} style={{ padding:"2px 9px", background:"rgba(0,212,255,0.07)", border:"1px solid rgba(0,212,255,0.2)", borderRadius:"3px", color:"#00d4ff", fontSize:"9px" }}>{tag}</span>
              ))}
            </div>
          </Section>
        )}
        {(report.associated_domains||[]).length > 0 && (
          <Section title="ASSOCIATED DOMAINS">
            {report.associated_domains.map(d => (
              <div key={d} style={{ fontSize:"10px", color:"#fb923c", marginBottom:"3px" }}>→ {d}</div>
            ))}
          </Section>
        )}
        {(report.associated_files||[]).length > 0 && (
          <Section title="ASSOCIATED FILES">
            {report.associated_files.map(f => (
              <div key={f} style={{ fontSize:"9px", color:th.textMuted, marginBottom:"3px", wordBreak:"break-all", fontFamily:"monospace" }}>{f}</div>
            ))}
          </Section>
        )}
      </>)}

      {/* HASH */}
      {report.type === "hash" && (<>
        <Section title="FILE INFORMATION">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <Field label="FILE TYPE" value={report.file_type  || "N/A"}/>
            <Field label="FIRST SEEN"   value={report.first_seen || "N/A"}/>
          </div>
        </Section>
        <Section title="DETECTIONS">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <Field label="VT MALICIOUS"  value={report.vt_malicious  ?? 0} color={report.vt_malicious  > 0 ? "#ef4444" : "#22c55e"}/>
            <Field label="VT UNDETECTED" value={report.vt_undetected ?? 0}/>
            <Field label="OTX PULSES"    value={report.otx_pulses    ?? 0}/>
          </div>
        </Section>
        {(report.mitre_attack||[]).length > 0 && (
          <Section title="MITRE ATT&CK">
            {report.mitre_attack.map(m => (
              <div key={m.technique_id} style={{ display:"flex", gap:"8px", marginBottom:"7px", padding:"8px 10px", background:"rgba(167,139,250,0.05)", border:"1px solid rgba(167,139,250,0.15)", borderRadius:"5px" }}>
                <span style={{ padding:"2px 8px", background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.3)", borderRadius:"3px", color:"#a78bfa", fontSize:"9px", whiteSpace:"nowrap", flexShrink:0, alignSelf:"flex-start" }}>{m.technique_id}</span>
                <div>
                  <div style={{ fontSize:"10px", color:th.text, marginBottom:"2px" }}>{m.technique_name}</div>
                  <div style={{ fontSize:"8px", color:th.textFaint }}>source: {m.source} · matched: {m.matched_on}</div>
                </div>
              </div>
            ))}
          </Section>
        )}
      </>)}

      {/* DOMAIN */}
      {report.type === "domain" && (<>
        <Section title="DOMAIN INFORMATION">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <Field label="IP"            value={report.ip_domain        || "N/A"}/>
            <Field label="REGISTRAR"     value={report.registrar        || "N/A"}/>
            <Field label="CREATION DATE" value={report.created          || "N/A"}/>
            <Field label="SUBDOMAINS" value={report.subdomains_count ?? "N/A"}/>
          </div>
        </Section>
        <Section title="DETECTIONS">
          <Field label="VT MALICIOUS" value={report.vt_malicious ?? 0} color={report.vt_malicious > 0 ? "#ef4444" : "#22c55e"}/>
        </Section>
      </>)}

      {/* URL */}
      {report.type === "url" && (<>
        <Section title="URL INFORMATION">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <Field label="DOMAIN" value={report.domain || "N/A"}/>
            <Field label="IP"      value={report.ip     || "N/A"}/>
            {report.hosting_platform && (
              <Field label="HOSTING PLATFORM" value={report.hosting_platform} color="#fb923c"/>
            )}
          </div>
        </Section>
        <Section title="DETECTIONS">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <Field label="VT MALICIOUS"  value={report.vt_malicious  ?? 0} color={report.vt_malicious  > 0 ? "#ef4444" : "#22c55e"}/>
            <Field label="VT SUSPICIOUS" value={report.vt_suspicious ?? 0} color={report.vt_suspicious > 0 ? "#eab308" : "#22c55e"}/>
            {(report.gsb_threats||[]).length > 0 && <Field label="GOOGLE SAFE BROWSING" value={report.gsb_threats.join(", ")} color="#ef4444"/>}
            {report.phishtank && <Field label="PHISHTANK" value={report.phishtank} color={report.phishtank==="clean"?"#22c55e":"#ef4444"}/>}
          </div>
        </Section>
      </>)}

      {/* MAIL */}
      {report.type === "mail" && (<>
        <Section title="MAIL INFORMATION">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <Field label="DOMAIN"  value={report.mail_domain || "N/A"}/>
            <Field label="PROVIDER" value={report.provider    || "N/A"}/>
          </div>
        </Section>
        <Section title="AUTHENTIFICATION">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"8px" }}>
            {["mx","spf","dmarc"].map(k => {
              const v  = report[k] || "missing";
              const ok = v !== "missing";
              return (
                <div key={k} style={{ padding:"8px", background:ok?"rgba(34,197,94,0.06)":"rgba(239,68,68,0.06)", border:`1px solid ${ok?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`, borderRadius:"5px", textAlign:"center" }}>
                  <div style={{ fontSize:"8px", letterSpacing:"1px", color:th.textFaint, marginBottom:"3px" }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize:"10px", fontWeight:"700", color:ok?"#22c55e":"#ef4444" }}>{v.toUpperCase()}</div>
                </div>
              );
            })}
          </div>
        </Section>
        {(report.alerts||[]).length > 0 && (
          <Section title="ALERTES">
            {report.alerts.map(a => (
              <div key={a} style={{ padding:"5px 10px", background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.15)", borderRadius:"3px", color:"#f87171", fontSize:"9px", marginBottom:"4px" }}>⚠ {a}</div>
            ))}
          </Section>
        )}
      </>)}

      {/* CVE */}
      {report.type === "cve" && (
        <Section title="CVE INFORMATION">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            <Field label="SEVERITY"   value={report.severity   || "N/A"} color="#ef4444"/>
            <Field label="CVSS SCORE" value={report.cvss_score ?? "N/A"} color={report.cvss_score>=9?"#ef4444":report.cvss_score>=7?"#f97316":"#eab308"}/>
            <Field label="PUBLISHED ON"  value={report.published  || "N/A"}/>
            {(report.cwe||[]).length > 0 && <Field label="CWE" value={report.cwe.join(", ")}/>}
          </div>
          {report.cvss_vector && <Field label="CVSS VECTOR" value={report.cvss_vector} mono/>}
        </Section>
      )}

    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
const MessageBubble = memo(function MessageBubble({ msg, darkMode }) {
  const th     = t(darkMode);
  const isUser = msg.role === "user";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:isUser?"flex-end":"flex-start", marginBottom:"18px", animation:"fadeInUp 0.25s ease-out" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px", flexDirection:isUser?"row-reverse":"row", marginBottom:"5px" }}>
        <div style={{ width:"22px", height:"22px", borderRadius:"50%", background:isUser?`linear-gradient(135deg,${th.accentDim},${th.accent})`:"linear-gradient(135deg,#1a2a3a,#2a4060)", border:`1px solid ${isUser?th.borderActive:th.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", flexShrink:0, boxShadow:isUser?`0 0 8px ${th.accentGlow}`:"none" }}>
          {isUser ? "▲" : "🛡"}
        </div>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", fontWeight:"700", letterSpacing:"2px", color:isUser?th.accent:"#4ade80" }}>
          {isUser ? "ANALYST" : "TI-ENGINE"}
        </span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"9px", color:th.textFaint }}>{msg.timestamp}</span>
      </div>

      <div style={{ maxWidth:"80%", background:isUser?th.userBubble:th.botBubble, border:`1px solid ${isUser?th.borderActive:th.border}`, borderRadius:isUser?"10px 10px 2px 10px":"10px 10px 10px 2px", padding:"11px 15px", color:th.text, fontSize:"12px", lineHeight:"1.65", fontFamily:"'JetBrains Mono',monospace", boxShadow:isUser?`0 2px 12px ${th.accentGlow}`:"none" }}>
        {msg.content}
      </div>

      {msg.report && (
        <div style={{ maxWidth:"92%", width:"100%" }}>
          <ReportCard report={msg.report} darkMode={darkMode}/>
        </div>
      )}
    </div>
  );
});

export default MessageBubble;