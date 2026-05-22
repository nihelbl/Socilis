import FilterBar from "./Filterbar";
import IOCRow    from "./IOCRow";

/**
 * Panneau gauche — barre de filtres + liste des IOC.
 * Props : scans, filter, onFilter, selectedIOC, onSelect, C (thème)
 */
export default function IOCList({ scans, filter, onFilter, selectedIOC, onSelect, C }) {
  const filtered = filter === "all"
    ? scans
    : scans.filter(d => d.final_verdict === filter || d.ioc_type === filter);

  return (
    <div style={{ flex: "0 0 48%", borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <FilterBar filter={filter} onFilter={onFilter} count={filtered.length} C={C} />

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {filtered.length === 0
          ? <div style={{ textAlign: "center", color: C.textFaint, fontSize: "0.6rem", letterSpacing: "0.2em", marginTop: "48px" }}>NO IOC FOUND</div>
          : filtered.map(ioc => (
              <IOCRow
                key={ioc.id}
                ioc={ioc}
                selected={selectedIOC?.id === ioc.id}
                onSelect={onSelect}
                C={C}
              />
            ))
        }
      </div>
    </div>
  );
}