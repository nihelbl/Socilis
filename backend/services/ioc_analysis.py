from __future__ import annotations
from typing import Literal
from rag.rag_retriever import retrieve
import re
import time
from typing import Any
from sqlalchemy.orm import Session
from database.models import ScanHistory
from services.domain_service import get_domain_report
from services.hash_services import get_hash_report
from services.ip_service import check_ip_reputation
from services.cve_service import get_cve_report
from services.llm_enricher import enrich_ioc, enrich_with_rag, _fallback, _build_ti_data
from services.mail_service import check_mail_reputation
from services.rag_gate import build_rag_query, collect_ti_signals
from services.url_service import get_url_report

Classification = Literal["CLEAN", "MALICIOUS", "SUSPECT", "UNKNOWN"]

# ─── Logger interne ───────────────────────────────────────────────────────────
_ICONS = {
    "ioc":      "🔍",
    "ti":       "📡",
    "classify": "🏷️ ",
    "rag":      "📚",
    "llm":      "🤖",
    "post":     "⚙️ ",
    "db":       "💾",
    "ok":       "✅",
    "warn":     "⚠️ ",
    "err":      "❌",
}

def _log(tag: str, msg: str, level: str = "info") -> None:
    icon = _ICONS.get(tag, "  ")
    prefix = f"[{tag.upper():8s}]"
    ts = time.strftime("%H:%M:%S")
    print(f"  {ts} {icon} {prefix} {msg}", flush=True)

def _log_sep(label: str = "") -> None:
    line = "─" * 60
    if label:
        pad = (58 - len(label)) // 2
        print(f"\n  {'─'*pad} {label} {'─'*(58-pad-len(label))}\n", flush=True)
    else:
        print(f"  {line}", flush=True)

# ─── Helpers (inchangés) ──────────────────────────────────────────────────────

def _lower(s: object) -> str:
    return (str(s) if s is not None else "").strip().lower()

def _as_int(x: object, default: int = 0) -> int:
    try:
        if x is None:
            return default
        return int(x)
    except (TypeError, ValueError):
        return default

def _confidence_numeric(raw: dict) -> float:
    c = raw.get("confidence")
    if isinstance(c, (int, float)):
        return float(c)
    m = {"strong": 90.0, "moderate": 60.0, "weak": 30.0}
    return m.get(_lower(c), 50.0)

def detect_type(indicator: str) -> str:
    indicator = indicator.strip()
    if re.match(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$", indicator, re.IGNORECASE):
        return "mail"
    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", indicator):
        return "ip"
    if re.match(r"^CVE-\d{4}-\d{4,}$", indicator.upper()):
        return "cve"
    if re.match(r"^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{63,64}$", indicator):
        return "hash"
    if re.match(r"^https?://", indicator, re.IGNORECASE):
        return "url"
    if re.match(r"^[\w\.-]+\.[a-z]{2,}$", indicator):
        return "domain"
    return "unknown"

def _save_scan(db: Session, user_id: int, indicator: str, ioc_type: str, llm_result: dict):
    _log("db", f"Sauvegarde scan — user_id={user_id}, verdict={llm_result.get('threat_level','?')}, score={llm_result.get('score','?')}")
    try:
        scan = ScanHistory(
            user_id=user_id,
            indicator=indicator,
            ioc_type=ioc_type,
            final_verdict=llm_result.get("threat_level", "unknown"),
            risk_score=llm_result.get("score", 0),
            llm_summary=llm_result.get("summary"),
        )
        db.add(scan)
        db.commit()
        _log("ok", "Scan sauvegardé en base avec succès")
    except Exception as e:
        db.rollback()
        _log("err", f"Échec sauvegarde DB : {e}")

def analyze_indicator_for_user(
    db: Session,
    user_id: int,
    indicator: str,
    force_rag: bool = False,
    model: str | None = None,
) -> dict[str, Any]:
    indicator = indicator.strip()

    _log_sep(f"ANALYSE IOC — user={user_id}")
    _log("ioc", f"Indicateur reçu : « {indicator} »")
    _log("ioc", f"Options         : force_rag={force_rag}, model={model or 'auto'}")

    if not indicator:
        _log("err", "Indicateur vide — requête rejetée (400)")
        return {"ok": False, "status_code": 400, "error": {"error": "Indicateur manquant"}}

    ioc_type = detect_type(indicator)
    _log("ioc", f"Type détecté    : {ioc_type.upper()}")

    if ioc_type not in ("ip", "domain", "hash", "url", "mail", "cve"):
        _log("err", f"Type non supporté : {ioc_type} — requête rejetée (400)")
        return {"ok": False, "status_code": 400, "error": {"error": f"Type non supporté : {ioc_type}"}}

    try:
        payload = analyze_ioc(indicator, ioc_type, force_rag=force_rag, model=model)
    except Exception as e:
        _log("err", f"Exception collecte TI : {e}")
        return {"ok": False, "status_code": 500, "error": {"error": f"Erreur collecte TI : {str(e)}"}}

    if "error" in payload:
        err = str(payload["error"])
        status = 500 if "réponse invalide" in err.lower() else 400
        _log("err", f"Payload contient une erreur ({status}) : {err}")
        return {"ok": False, "status_code": status, "error": {"error": payload["error"]}}

    _save_scan(db, user_id, indicator, ioc_type, payload.get("llm_analysis", {}))
    _log_sep()
    return {"ok": True, "payload": payload}


# ─── Helpers classification ───────────────────────────────────────────────────

def _global_risk_score(raw: dict, ioc_type: str) -> int | None:
    v = raw.get("global_risk_score") or raw.get("risk_score")
    if v is None:
        return None
    return _as_int(v, -1) if v != "" else None

def _verdict_for_type(raw: dict, ioc_type: str) -> str:
    t = _lower(ioc_type)
    if t == "domain":
        return _lower(raw.get("global_risk_level") or raw.get("final_verdict"))
    if t == "hash":
        return _lower(raw.get("risk_level") or raw.get("global_risk_level"))
    if t == "url":
        return _lower(raw.get("final_verdict") or raw.get("global_risk_level"))
    if t == "mail":
        return _lower(raw.get("verdict"))
    return _lower(raw.get("final_verdict"))

def _ip_vt_malicious(raw: dict) -> int:
    stats = (raw.get("virustotal") or {}).get("stats") or {}
    return _as_int(stats.get("malicious"))

def _hash_vt_malicious(raw: dict) -> int:
    det = raw.get("detection") or {}
    return _as_int(det.get("malicious"))

def _url_vt_malicious(raw: dict) -> int:
    vt = (raw.get("vendors") or {}).get("virustotal") or {}
    return _as_int(vt.get("malicious"))

def _vt_malicious_count(raw: dict, ioc_type: str) -> int:
    t = _lower(ioc_type)
    if t == "ip":
        return _ip_vt_malicious(raw)
    if t == "domain":
        return _as_int((raw.get("virustotal") or {}).get("detection", {}).get("malicious"))
    if t == "hash":
        return _hash_vt_malicious(raw)
    if t == "url":
        return _url_vt_malicious(raw)
    return 0

def _vt_verdict_clean(raw: dict, ioc_type: str) -> bool:
    t = _lower(ioc_type)
    if t == "ip":
        return _lower((raw.get("virustotal") or {}).get("verdict")) == "clean"
    if t == "domain":
        vt = raw.get("virustotal") or {}
        det = vt.get("detection") or {}
        if _as_int(det.get("malicious")) > 0:
            return False
        rl = _lower(vt.get("risk_level", ""))
        return rl in ("clean", "low", "none")
    if t == "hash":
        if _hash_vt_malicious(raw) > 0:
            return False
        rl = _lower(raw.get("risk_level", ""))
        return rl in ("clean", "low", "undetected")
    if t == "url":
        vt = (raw.get("vendors") or {}).get("virustotal") or {}
        if _as_int(vt.get("malicious")) > 0:
            return False
        return _lower(vt.get("verdict")) == "clean"
    return True

def _must_use_llm_rule(raw: dict, ioc_type: str) -> bool:
    t = _lower(ioc_type)
    gv = _verdict_for_type(raw, t)
    if gv in ("malicious", "high", "suspicious", "suspect", "douteux"):
        return True
    grs = _global_risk_score(raw, t)
    if grs is not None and grs > 50:
        return True
    if _vt_malicious_count(raw, t) > 0:
        return True
    return False

def should_skip_llm_entirely(raw: dict, ioc_type: str) -> bool:
    if _must_use_llm_rule(raw, ioc_type):
        return False
    t = _lower(ioc_type)
    gv = _verdict_for_type(raw, t)
    vm = _vt_malicious_count(raw, t)
    grs = _global_risk_score(raw, t)
    conf = _confidence_numeric(raw)
    if gv == "unknown":
        if (grs is None or grs == 0) and _vt_verdict_clean(raw, t):
            return True
        return False
    if gv in ("clean", "fiable"):
        return True
    if gv in ("low", "undetected") and vm == 0:
        return True
    if (
        grs is not None
        and grs == 0
        and gv not in ("suspicious", "suspect", "douteux", "malicious", "high", "unknown")
    ):
        return True
    if _vt_verdict_clean(raw, t):
        return True
    if conf >= 90 and vm == 0:
        return True
    if t == "mail":
        if gv == "fiable":
            return True
    if t == "domain":
        phishing = raw.get("phishing_analysis", {})
        if phishing.get("is_suspicious"):
            return False
    if t == "domain" and gv in ("clean", "low") and vm == 0:
        return True
    return False

def classify_indicator(raw: dict, indicator_type: str) -> Classification:
    if should_skip_llm_entirely(raw, indicator_type):
        return "CLEAN"
    return _non_clean_display_bucket(raw, indicator_type)

def _non_clean_display_bucket(raw: dict, ioc_type: str) -> Classification:
    gv = _verdict_for_type(raw, _lower(ioc_type))
    if gv in ("malicious", "high"):
        return "MALICIOUS"
    if gv in ("suspicious", "suspect", "douteux"):
        return "SUSPECT"
    return "UNKNOWN"

def get_threat_intelligence(indicator: str, indicator_type: str) -> dict:
    t = _lower(indicator_type)
    if t == "ip":
        return check_ip_reputation(indicator)
    if t == "domain":
        return get_domain_report(indicator)
    if t == "hash":
        return get_hash_report(indicator)
    if t == "url":
        return get_url_report(indicator)
    if t == "mail":
        return check_mail_reputation(indicator)
    if t == "cve":
        return get_cve_report(indicator)
    raise ValueError(f"Type TI non supporté : {indicator_type}")

def _prepare_ti_for_llm(ioc_type: str, raw: dict, indicator: str) -> dict:
    ti = _build_ti_data(ioc_type, raw)
    ti["indicator"]  = indicator
    ti["sources_ti"] = _SOURCES_MAP.get(ioc_type, ["VirusTotal"])
    if ioc_type == "domain":
        ti.setdefault("global_risk_score", raw.get("global_risk_score"))
    if ioc_type == "mail":
        ti["score"]        = raw.get("score", ti.get("score", 0))
        ti["final_verdict"] = raw.get("verdict", "unknown")
        ti["alerts"]       = raw.get("alertes", [])
    if ioc_type == "hash":
        ti.setdefault("otx_malware_families", (raw.get("otx") or {}).get("malware_families", []))
        ti.setdefault("mitre_attack", raw.get("mitre_attack", []))
    return ti

def build_clean_response(raw: dict, ti_data: dict, ioc_type: str) -> dict:
    gv = _verdict_for_type(raw, ioc_type)
    if ioc_type == "ip":
        vt_stats = (raw.get("virustotal") or {}).get("stats", {})
        abuse    = (raw.get("abuseipdb") or {}).get("abuse_score", 0)
        otx      = (raw.get("otx") or {}).get("pulse_count", 0)
        summary  = (
            f"IP analysée par VirusTotal ({vt_stats.get('harmless',0)} moteurs bénins, "
            f"0 détection malveillante), AbuseIPDB (score {abuse}/100) "
            f"et OTX ({otx} pulses). Aucune menace confirmée."
        )
    elif ioc_type == "domain":
        mal  = (raw.get("virustotal") or {}).get("detection", {}).get("malicious", 0)
        grs  = raw.get("global_risk_score", 0)
        reg  = raw.get("registrar", "inconnu")
        summary = (
            f"Domaine analysé par VirusTotal (0 détections malveillantes sur {mal} moteurs), "
            f"score de risque global : {grs}/100. Registrar : {reg}. "
            f"Aucun indicateur de compromission détecté."
        )
    elif ioc_type == "hash":
        summary = (
            f"Hash analysé par VirusTotal et OTX — 0 moteur de détection "
            f"n'a signalé ce fichier comme malveillant. Fichier considéré sain."
        )
    elif ioc_type == "url":
        summary = (
            f"URL analysée par VirusTotal, Google Safe Browsing et PhishTank — "
            f"aucune détection malveillante. Aucun signal de phishing confirmé."
        )
    elif ioc_type == "mail":
        score = raw.get("score", 0)
        prov  = raw.get("fournisseur", "inconnu")
        summary = (
            f"Adresse email analysée via MXToolbox — score de réputation : {score}/100. "
            f"Fournisseur détecté : {prov}. SPF et DMARC vérifiés. "
            f"Aucun signal de phishing ou d'usurpation détecté."
        )
    else:
        summary = f"Indicateur classé bénin par les flux Threat Intelligence (verdict : {gv})."

    return {
        "threat_level"  : "clean",
        "score"         : 0,
        "summary"       : summary,
        "tags"          : [],
        "recommandation": "Aucune action requise. Surveillance passive recommandée.",
        "model_used"    : None,
        "rag_used"      : False,
        "fallback"      : False,
        "sources_ti"    : ti_data.get("sources_ti"),
    }

def _apply_ip_suspicious_severity_cap(raw: dict, ioc_type: str, llm_result: dict) -> dict:
    if _lower(ioc_type) != "ip":
        return llm_result
    if _lower(raw.get("final_verdict", "")) != "suspicious":
        return llm_result
    out = dict(llm_result)
    tl = _lower(out.get("threat_level", ""))
    if tl in ("high", "critical"):
        out["threat_level"] = "medium"
        sc = out.get("score")
        if isinstance(sc, (int, float)) and sc > 55:
            out["score"] = min(55, int(sc))
    return out

_SOURCES_MAP = {
    "ip":     ["VirusTotal", "AbuseIPDB", "OTX"],
    "hash":   ["VirusTotal", "OTX"],
    "domain": ["VirusTotal", "HackerTarget"],
    "url":    ["VirusTotal", "GoogleSafeBrowsing", "PhishTank"],
    "mail":   ["MXToolbox"],
    "cve":    ["CIRCL", "NVD"],
}

def _run_llm_with_rag(
    indicator: str,
    ioc_type: str,
    raw: dict,
    ti_norm: dict,
    final_verdict: str,
    model: str | None = None,
) -> tuple[list, bool, str | None, str | None, dict]:

    _log("rag", f"Construction de la requête RAG...")
    ti_signals = collect_ti_signals(ioc_type, raw)
    _log("rag", f"Signaux TI collectés : {ti_signals}")

    rag_docs: list = []
    rag_fetch_error: str | None = None
    skip_rag = False
    rag_gate_reason: str | None = None

    try:
        rag_query = build_rag_query(ioc_type, raw, ti_norm)
        _log("rag", f"Requête RAG : « {rag_query[:80]}{'...' if len(rag_query)>80 else ''} »")

        t0 = time.time()
        rag_docs = retrieve(query=rag_query, k=5, min_score=0.35, ioc_type=ioc_type)
        elapsed = time.time() - t0
        _log("rag", f"Récupération RAG terminée en {elapsed:.2f}s — {len(rag_docs)} doc(s) retourné(s)")

        if rag_docs:
            scores = [f"{d['score']:.3f}" for d in rag_docs]
            _log("rag", f"Scores de similarité : [{', '.join(scores)}]")
        else:
            _log("warn", "Aucun document RAG retourné (seuil min_score=0.35 non atteint)")

        # Filtrage selon verdict
        verdict = _verdict_for_type(raw, ioc_type)
        vt_malicious = _vt_malicious_count(raw, ioc_type)
        _log("rag", f"Filtrage docs RAG — verdict={verdict}, vt_malicious={vt_malicious}")

        CLEAN_KEYWORDS = [
            "clean verdict", "zero malicious", "0 malicious", "benign",
            "no action required", "not malicious", "no confirmed threat",
            "classify as clean", "no detection", "whitelist", "safe",
            "no threat", "appears legitimate", "close the investigation"
        ]
        before = len(rag_docs)
        if vt_malicious > 0 or verdict in ("malicious", "high", "critical"):
            filtered = [doc for doc in rag_docs if not any(kw in doc["text"].lower() for kw in CLEAN_KEYWORDS)]
            rag_docs = filtered if filtered else rag_docs
        elif vt_malicious == 0 and verdict in ("clean", "low", "undetected"):
            filtered = [doc for doc in rag_docs if any(kw in doc["text"].lower() for kw in CLEAN_KEYWORDS)]
            rag_docs = filtered if filtered else rag_docs[:2]

        if ioc_type == "mail":
            NEGATIVE_ONLY = ["suspicious", "phishing", "malicious", "urgency", "impersonation"]
            POSITIVE_HINT = ["legitimate", "benign", "trusted", "clean", "valid spf", "valid dmarc"]
            cleaned = [
                doc for doc in rag_docs
                if not all(kw in doc["text"].lower() for kw in NEGATIVE_ONLY[:2])
                or any(kw in doc["text"].lower() for kw in POSITIVE_HINT)
            ]
            rag_docs = cleaned if cleaned else rag_docs[:2]

        after = len(rag_docs)
        if before != after:
            _log("rag", f"Après filtrage thématique : {before} → {after} doc(s) conservé(s)")

    except Exception as e:
        rag_docs = []
        rag_fetch_error = str(e)
        _log("err", f"Erreur récupération RAG : {e}")

    # Appel LLM
    if rag_docs:
        _log("llm", f"Enrichissement LLM avec RAG ({len(rag_docs)} doc(s))...")
        sources = [d.get("source", "?") for d in rag_docs]
        _log("llm", f"Sources RAG injectées : {sources}")
        t0 = time.time()
        llm_result = enrich_with_rag(
            ioc=indicator,
            ioc_type=ioc_type,
            final_verdict=final_verdict,
            rag_docs=rag_docs,
            ti_data=ti_norm,
            model=model,
        )
    else:
        _log("llm", "Enrichissement LLM sans RAG (aucun doc disponible)...")
        t0 = time.time()
        llm_result = enrich_ioc(ioc_type, raw, model=model)

    elapsed = time.time() - t0
    _log("llm", f"Réponse LLM reçue en {elapsed:.2f}s")

    if "error" in llm_result or not llm_result.get("threat_level"):
        reason = llm_result.get("error", "threat_level null")
        _log("warn", f"LLM KO ou incomplet ({reason}) → activation du fallback")
        llm_result = _fallback(ti_norm, reason=reason)
        _log("llm", f"Fallback appliqué : threat_level={llm_result.get('threat_level')}, score={llm_result.get('score')}")
    else:
        _log("ok", f"LLM → threat_level={llm_result.get('threat_level')}, score={llm_result.get('score')}, rag_used={llm_result.get('rag_used', False)}")

    llm_result = _apply_ip_suspicious_severity_cap(raw, ioc_type, llm_result)

    return rag_docs, skip_rag, rag_gate_reason, rag_fetch_error, llm_result


# ─── Sections API (inchangées) ────────────────────────────────────────────────

def api_ti_section(ioc_type: str, raw: dict) -> dict:
    if ioc_type == "ip":
        return {
            "country": raw.get("virustotal", {}).get("country"),
            "asn": raw.get("virustotal", {}).get("asn"),
            "as_owner": raw.get("virustotal", {}).get("as_owner"),
            "vt_tags": [t for t in raw.get("virustotal", {}).get("tags", []) if t != "no tags"],
            "vt_reputation": raw.get("virustotal", {}).get("reputation"),
            "vt_votes": raw.get("virustotal", {}).get("votes"),
            "vt_verdict": raw.get("virustotal", {}).get("verdict"),
            "vt_stats": raw.get("virustotal", {}).get("stats"),
            "vt_relations": {k: v for k, v in raw.get("virustotal", {}).get("relations", {}).items() if v},
            "abuseipdb": raw.get("abuseipdb"),
            "otx": raw.get("otx"),
            "talos": raw.get("talos"),
            "final_verdict": raw.get("final_verdict"),
        }
    if ioc_type == "domain":
        return {
            "ip_address": raw.get("ip_address"),
            "registrar": raw.get("registrar"),
            "creation_date": raw.get("creation_date"),
            "vt_verdict": raw.get("virustotal", {}).get("risk_level"),
            "vt_detection": raw.get("virustotal", {}).get("detection"),
            "vt_reputation": raw.get("virustotal", {}).get("reputation_score"),
            "subdomains": raw.get("hackertarget", {}).get("subdomains", []),
            "subdomains_count": raw.get("hackertarget", {}).get("subdomains_count", 0),
            "global_risk_score": raw.get("global_risk_score"),
            "confidence": raw.get("confidence"),
            "final_verdict": raw.get("global_risk_level"),
        }
    if ioc_type == "hash":
        return {
            "file_type": raw.get("file_type"),
            "first_submission": raw.get("first_submission"),
            "reputation": raw.get("reputation_score"),
            "vt_detection": raw.get("detection"),
            "mitre_attack": raw.get("mitre_attack", []),
            "otx": raw.get("otx", {}),
            "final_verdict": raw.get("risk_level"),
        }
    if ioc_type == "url":
        return {
            "domain": raw.get("domain"),
            "ip": raw.get("ip"),
            "scan_time": raw.get("scan_time"),
            "virustotal": raw.get("vendors", {}).get("virustotal"),
            "google_safe_browsing": raw.get("vendors", {}).get("google_safe_browsing"),
            "phishtank": raw.get("vendors", {}).get("phishtank"),
            "global_risk_score": raw.get("global_risk_score"),
            "confidence": raw.get("confidence"),
            "final_verdict": raw.get("final_verdict"),
            "phishing_signals": raw.get("phishing_analysis", {}).get("signals", []),
            "hosting_platform": raw.get("phishing_analysis", {}).get("hosting_platform"),
        }
    if ioc_type == "mail":
        return {
            "domain": raw.get("domaine"),
            "mx": raw.get("mx", []),
            "spf": raw.get("spf"),
            "dmarc": raw.get("dmarc"),
            "fournisseur": raw.get("fournisseur"),
            "alertes": raw.get("alertes", []),
            "score": raw.get("score"),
            "final_verdict": raw.get("verdict"),
        }
    if ioc_type == "cve":
        return {
            "source":        raw.get("source"),
            "description":   raw.get("description"),
            "severity":      raw.get("severity"),
            "cvss_score":    raw.get("cvss_score"),
            "cvss_v2_score": raw.get("cvss_v2_score"),
            "cvss_vector":   raw.get("cvss_vector"),
            "published":     raw.get("published"),
            "last_modified": raw.get("last_modified"),
            "cwe":           raw.get("cwe", []),
            "affected":      raw.get("affected", []),
            "references":    raw.get("references", []),
            "final_verdict": raw.get("risk", {}).get("level"),
        }
    return {}

def _build_ti_summary(ioc_type: str, ti_data: dict) -> dict:
    if ioc_type == "ip":
        vt_stats = ti_data.get("vt_stats", {}) or {}
        return {
            "isp":               ti_data.get("as_owner"),
            "asn":               ti_data.get("asn"),
            "country":           ti_data.get("country"),
            "vt_tags":           ti_data.get("vt_tags", []),
            "vt_reputation":     ti_data.get("vt_reputation"),
            "reputation": {
                "virustotal": {
                    "malicious":  vt_stats.get("malicious", 0),
                    "suspicious": vt_stats.get("suspicious", 0),
                },
                "abuseipdb": {"score": (ti_data.get("abuseipdb") or {}).get("abuse_score", 0)},
                "otx":       {"pulses": (ti_data.get("otx") or {}).get("pulse_count", 0)},
            },
            "associated_domains": ti_data.get("vt_relations", {}).get("contacted_domains", []),
            "associated_files":   ti_data.get("vt_relations", {}).get("contacted_files", []),
        }
    elif ioc_type == "domain":
        vt_det = ti_data.get("vt_detection", {}) or {}
        return {
            "ip":               ti_data.get("ip_address"),
            "registrar":        ti_data.get("registrar"),
            "created":          ti_data.get("creation_date"),
            "subdomains_count": ti_data.get("subdomains_count", 0),
            "global_risk_score":ti_data.get("global_risk_score"),
            "detection": {
                "virustotal": {
                    "malicious":  vt_det.get("malicious", 0),
                    "suspicious": vt_det.get("suspicious", 0),
                }
            },
        }
    elif ioc_type == "hash":
        vt_det = ti_data.get("vt_detection", {}) or {}
        return {
            "file_type":    ti_data.get("file_type"),
            "first_seen":   ti_data.get("first_submission"),
            "mitre_attack": ti_data.get("mitre_attack", []),
            "detection": {
                "virustotal": {
                    "malicious":  vt_det.get("malicious", 0),
                    "undetected": vt_det.get("undetected", 0),
                },
                "otx": {"pulses": (ti_data.get("otx") or {}).get("pulse_count", 0)},
            },
        }
    elif ioc_type == "url":
        vt  = ti_data.get("virustotal", {}) or {}
        gsb = ti_data.get("google_safe_browsing", {}) or {}
        pt  = ti_data.get("phishtank", {}) or {}
        return {
            "domain":           ti_data.get("domain"),
            "ip":               ti_data.get("ip"),
            "global_risk_score":ti_data.get("global_risk_score"),
            "hosting_platform": ti_data.get("hosting_platform"),
            "phishing_signals": ti_data.get("phishing_signals", []),
            "detection": {
                "virustotal": {
                    "malicious":  vt.get("malicious", 0),
                    "suspicious": vt.get("suspicious", 0),
                },
                "google_safe_browsing": {
                    "verdict":  gsb.get("verdict", "clean"),
                    "threats":  gsb.get("threats", []),
                },
                "phishtank": {
                    "verdict":  pt.get("verdict", "clean"),
                    "verified": pt.get("verified", False),
                },
            },
        }
    elif ioc_type == "mail":
        mx_list = ti_data.get("mx", [])
        mx_str = ", ".join(m.get("serveur", str(m)) if isinstance(m, dict) else str(m) for m in mx_list) if mx_list else None
        return {
            "domain":   ti_data.get("domain") or ti_data.get("domaine"),
            "provider": ti_data.get("fournisseur") or ti_data.get("provider"),
            "security": {
                "mx":    mx_str,
                "spf":   ti_data.get("spf"),
                "dmarc": ti_data.get("dmarc"),
            },
            "alerts": ti_data.get("alertes") or ti_data.get("alerts", []),
            "score":  ti_data.get("score"),
        }
    elif ioc_type == "cve":
        return {
            "severity":    ti_data.get("severity"),
            "cvss_score":  ti_data.get("cvss_score"),
            "cvss_vector": ti_data.get("cvss_vector"),
            "cwe":         ti_data.get("cwe", []),
            "published":   ti_data.get("published"),
            "description": ti_data.get("description"),
        }
    return {}


# ─── Fonction principale ──────────────────────────────────────────────────────

def analyze_ioc(
    indicator: str,
    indicator_type: str,
    force_rag: bool = False,
    model: str | None = None,
) -> dict:
    indicator = indicator.strip()
    ioc_type  = _lower(indicator_type)
    t_start   = time.time()

    # ── Étape 1 : Collecte Threat Intelligence ────────────────────────────────
    _log("ti", f"Collecte Threat Intelligence via {_SOURCES_MAP.get(ioc_type, ['?'])}...")
    t0 = time.time()
    raw = get_threat_intelligence(indicator, ioc_type)
    ti_elapsed = time.time() - t0

    if not raw or not isinstance(raw, dict):
        _log("err", f"Réponse TI invalide pour {indicator} (type retourné : {type(raw).__name__})")
        return {"error": f"Service TI a retourné une réponse invalide pour {indicator}"}
    if "error" in raw:
        _log("err", f"Erreur retournée par le service TI : {raw['error']}")
        return {"error": raw["error"]}

    _log("ok", f"Données TI reçues en {ti_elapsed:.2f}s — clés : {list(raw.keys())}")

    # ── Étape 2 : Normalisation pour LLM ─────────────────────────────────────
    _log("ti", "Normalisation des données TI pour le LLM...")
    ti_norm = _prepare_ti_for_llm(ioc_type, raw, indicator)
    _log("ok", f"Données normalisées — sources_ti : {ti_norm.get('sources_ti', [])}")

    # ── Étape 3 : Classification ──────────────────────────────────────────────
    _log("classify", "Classification de l'indicateur...")
    verdict_raw = _verdict_for_type(raw, ioc_type)
    vt_mal      = _vt_malicious_count(raw, ioc_type)
    grs         = _global_risk_score(raw, ioc_type)
    must_llm    = _must_use_llm_rule(raw, ioc_type)
    skip_llm    = should_skip_llm_entirely(raw, ioc_type)

    _log("classify", f"Verdict brut TI   : {verdict_raw or 'n/a'}")
    _log("classify", f"VT malicious count: {vt_mal}  |  Global risk score: {grs}")
    _log("classify", f"must_use_llm={must_llm}  |  skip_llm={skip_llm}")

    classification = classify_indicator(raw, ioc_type)
    _log("ok", f"Classification finale : ► {classification} ◄")

    final_verdict = raw.get("final_verdict") or raw.get("global_risk_level", "unknown")

    rag_docs: list = []
    skip_rag = False
    rag_gate_reason: str | None = None
    rag_fetch_error: str | None = None

    # ── Étape 4 : Chemin CLEAN ou LLM+RAG ────────────────────────────────────
    if classification == "CLEAN" and not force_rag:
        _log("llm", "IOC CLEAN → génération réponse sans LLM (ti_clean_skip_llm)")
        llm_result = build_clean_response(raw, ti_norm, ioc_type)
        skip_rag = True
        rag_gate_reason = "ti_clean_skip_llm"
        rag_docs = []
        _log("ok", f"Réponse CLEAN construite — score=0, threat_level=clean")
    else:
        _log("llm", f"IOC {classification} → enrichissement LLM + RAG requis")
        try:
            rag_docs, skip_rag, rag_gate_reason, rag_fetch_error, llm_result = _run_llm_with_rag(
                indicator, ioc_type, raw, ti_norm, str(final_verdict), model=model
            )
        except Exception as e:
            _log("err", f"Exception dans _run_llm_with_rag : {e}")
            llm_result = {
                "threat_level": "unknown",
                "score": 0,
                "summary": f"LLM indisponible : {str(e)}",
                "tags": [],
                "recommandation": "Analyse manuelle requise.",
                "fallback": True,
            }

    # ── Étape 5 : Post-processing par type ───────────────────────────────────
    _log("post", f"Post-processing spécifique au type : {ioc_type.upper()}")
    tl_before = llm_result.get("threat_level")

    if ioc_type == "mail":
        mail_score   = raw.get("score", 0)
        mail_verdict = _lower(raw.get("verdict", ""))
        n_alerts     = len(raw.get("alertes", []))
        _log("post", f"[MAIL] score={mail_score}, verdict={mail_verdict}, alertes={n_alerts}")
        if (mail_score >= 50 or mail_verdict in ("fiable", "clean", "low")) and n_alerts <= 3:
            tl = _lower(llm_result.get("threat_level", ""))
            if tl in ("high", "critical", "medium"):
                _log("warn", f"[MAIL] Cap {tl} → low (score élevé, peu d'alertes)")
                llm_result["threat_level"] = "low"
                llm_result["score"] = min(25, llm_result.get("score", 25))

    elif ioc_type == "hash":
        vt_mal = _hash_vt_malicious(raw)
        tl = _lower(llm_result.get("threat_level", ""))
        _log("post", f"[HASH] vt_malicious={vt_mal}, threat_level_llm={tl}")
        if vt_mal == 0 and tl in ("high", "critical", "medium"):
            _log("warn", f"[HASH] Cap {tl} → low (vt_malicious=0, LLM sur-classe)")
            llm_result["threat_level"] = "low"
            llm_result["score"] = min(20, llm_result.get("score", 20))
        elif vt_mal > 20 and tl in ("low", "clean"):
            _log("warn", f"[HASH] Force → high (vt_malicious={vt_mal}, LLM sous-classe)")
            llm_result["threat_level"] = "high"
            llm_result["score"] = max(75, llm_result.get("score", 75))

    elif ioc_type == "domain":
        vt_mal = _as_int((raw.get("virustotal") or {}).get("detection", {}).get("malicious"))
        grs    = _global_risk_score(raw, "domain") or 0
        tl     = _lower(llm_result.get("threat_level", ""))
        _log("post", f"[DOMAIN] vt_malicious={vt_mal}, grs={grs}, threat_level_llm={tl}")
        if vt_mal == 0 and grs <= 10 and tl in ("high", "critical"):
            _log("warn", f"[DOMAIN] Cap {tl} → low (vt_mal=0, grs={grs})")
            llm_result["threat_level"] = "low"
            llm_result["score"] = min(20, llm_result.get("score", 20))
        elif vt_mal > 3 and tl in ("low", "clean"):
            _log("warn", f"[DOMAIN] Force → high (vt_mal={vt_mal})")
            llm_result["threat_level"] = "high"
            llm_result["score"] = max(75, llm_result.get("score", 75))

    elif ioc_type == "url":
        vt_mal = _url_vt_malicious(raw)
        gsb    = _lower((raw.get("vendors") or {}).get("google_safe_browsing", {}).get("verdict", ""))
        tl     = _lower(llm_result.get("threat_level", ""))
        _log("post", f"[URL] vt_malicious={vt_mal}, gsb={gsb or 'n/a'}, threat_level_llm={tl}")
        if vt_mal == 0 and gsb != "malicious" and tl in ("high", "critical"):
            _log("warn", f"[URL] Cap {tl} → low (vt_mal=0, gsb={gsb})")
            llm_result["threat_level"] = "low"
            llm_result["score"] = min(20, llm_result.get("score", 20))
        elif (vt_mal > 3 or gsb == "malicious") and tl in ("low", "clean"):
            _log("warn", f"[URL] Force → high (vt_mal={vt_mal}, gsb={gsb})")
            llm_result["threat_level"] = "high"
            llm_result["score"] = max(75, llm_result.get("score", 75))

    elif ioc_type == "ip":
        vt_mal = _ip_vt_malicious(raw)
        abuse  = _as_int((raw.get("abuseipdb") or {}).get("abuse_score", 0))
        tl     = _lower(llm_result.get("threat_level", ""))
        _log("post", f"[IP] vt_malicious={vt_mal}, abuse_score={abuse}, threat_level_llm={tl}")
        if vt_mal == 0 and abuse < 20 and tl in ("high", "critical"):
            _log("warn", f"[IP] Cap {tl} → low (vt_mal=0, abuse={abuse})")
            llm_result["threat_level"] = "low"
            llm_result["score"] = min(25, llm_result.get("score", 25))

    elif ioc_type == "cve":
        cvss     = float(raw.get("cvss_score") or 0)
        severity = (raw.get("severity") or "").upper()
        tl       = _lower(llm_result.get("threat_level", ""))
        _log("post", f"[CVE] severity={severity}, cvss={cvss}, threat_level_llm={tl}")
        if (severity == "CRITICAL" or cvss >= 9.0) and tl in ("clean", "low", "medium", "unknown"):
            llm_result["threat_level"] = "critical"
            llm_result["score"]        = max(90, llm_result.get("score") or 0)
        elif (severity == "HIGH" or cvss >= 7.0) and tl in ("clean", "low", "unknown"):
            llm_result["threat_level"] = "high"
            llm_result["score"]        = max(70, llm_result.get("score") or 0)
        elif (severity == "MEDIUM" or cvss >= 4.0) and tl in ("clean", "low", "unknown"):
            llm_result["threat_level"] = "medium"
            llm_result["score"]        = max(45, llm_result.get("score") or 0)
        elif (severity == "LOW" or cvss > 0) and tl in ("clean", "unknown"):
            llm_result["threat_level"] = "low"
            llm_result["score"]        = max(20, llm_result.get("score") or 0)

    tl_after = llm_result.get("threat_level")
    if tl_before != tl_after:
        _log("post", f"Threat level ajusté : {tl_before} → {tl_after}")
    else:
        _log("post", f"Aucun ajustement — threat_level={tl_after}, score={llm_result.get('score')}")

    # ── Résumé final ──────────────────────────────────────────────────────────
    total_elapsed = time.time() - t_start
    _log("ok", (
        f"Analyse complète en {total_elapsed:.2f}s — "
        f"verdict={tl_after}, score={llm_result.get('score')}, "
        f"rag_used={llm_result.get('rag_used', False)}, "
        f"fallback={llm_result.get('fallback', False)}"
    ))

    rag_context = (
        [{"text": r["text"], "source": r["source"], "score": r["score"]} for r in rag_docs]
        if rag_docs else []
    )

    return {
        "indicator": indicator,
        "type": ioc_type,
        "ti_data": api_ti_section(ioc_type, raw),
        "ioc_classification": classification,
        "rag_context": rag_context,
        "llm_analysis": {
            "threat_level": llm_result.get("threat_level"),
            "score": llm_result.get("score"),
            "summary": llm_result.get("summary"),
            "tags": llm_result.get("tags", []),
            "recommended_action": llm_result.get("recommandation"),
            "model": llm_result.get("model_used"),
            "rag_used": llm_result.get("rag_used", False),
            "fallback": llm_result.get("fallback", False),
            "rag_skipped": skip_rag,
            "rag_skip_reason": rag_gate_reason if skip_rag else None,
            "rag_fetch_error": rag_fetch_error,
            "ti_only": classification == "CLEAN",
        },
    }