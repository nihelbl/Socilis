import { THREAT_META, IOC_TYPE_META } from "../../constants";

const FILTERS = [
  { key: "all",      label: "ALL"     },
  { key: "critical", label: "CRITICAL" },
  { key: "high",     label: "HIGHT"    },
  { key: "medium",   label: "MEDIUM"    },
  { key: "low",      label: "LOW"   },
  { key: "ip",       label: "IP"       },
  { key: "hash",     label: "HASH"     },
  { key: "domain",   label: "DOMAIN"   },
  { key: "url",      label: "URL"      },
  { key: "mail",     label: "MAIL"     },
  { key: "cve",      label: "CVE"      },
];

/**
 * Barre de filtres de la liste IOC.
 * Props : filter (actif), onFilter, count (nb résultats), C (thème)
 */
export default function FilterBar({ filter, onFilter, count, C }) {
  return (
    <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: "5px", flexWrap: "wrap", flexShrink: 0, alignItems: "center", background: C.filtersBar }}>
      {FILTERS.map(f => {
        const active = filter === f.key;
        const color  = THREAT_META[f.key]?.color || IOC_TYPE_META[f.key]?.color || C.green;
        return (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            style={{ padding: "3px 10px", background: active ? `${color}12` : "transparent", border: `1px solid ${active ? color + "55" : C.border}`, borderRadius: "4px", color: active ? color : C.textMuted, fontSize: "0.58rem", letterSpacing: "0.12em", cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all 0.15s" }}
          >
            {f.label}
          </button>
        );
      })}
      <span style={{ marginLeft: "auto", fontSize: "0.58rem", color: C.textFaint, letterSpacing: "0.1em" }}>
        {count} IOC{count > 1 ? "s" : ""}
      </span>
    </div>
  );
}