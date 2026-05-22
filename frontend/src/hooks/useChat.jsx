import { useState, useRef, useEffect, useCallback } from "react";
import { chatbotApi }       from "../api";
import { stripIOCPrefix }   from "../utils/iocDetector";
import { getTime }          from "../utils/formatUtils";
import { buildReport }      from "../utils/reportUtils";

// Compteur global stable — évite les collisions Date.now() en React StrictMode
let _msgId = 1;
const nextId = () => ++_msgId;

function makeInitMsg() {
  return {
    id: 1, role: "bot",
    content: "SOCILIS system initialized. Submit an IOC (Hash, IP, URL, Domain, Email, or CVE) for analysis, or ask a cybersecurity-related question.",
    timestamp: getTime(),
  };
}

export function useChat(selectedModel) {
  const [messages,  setMessages]  = useState([makeInitMsg()]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [activeIOC, setActiveIOC] = useState(null);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectIOC = useCallback((type) => {
    setActiveIOC(type);
    setInput(prev => type
      ? `[${type}] ${stripIOCPrefix(prev)}`
      : stripIOCPrefix(prev)
    );
  }, []);

  const sendMessage = useCallback(async () => {
    const raw = input.trim();
    if (!raw || loading) return;

    setInput("");
    setMessages(prev => [...prev, {
      id: nextId(), role: "user",
      content: raw, timestamp: getTime(),
    }]);
    setLoading(true);

    const clean = stripIOCPrefix(raw);

    try {
      const data = await chatbotApi.message(clean, null, selectedModel);

      const botMsg = (data.type && data.type !== "question")
        ? {
            id: nextId(), role: "bot",
            content: data.message || `Analyse terminée — ${data.type} : ${clean}`,
            timestamp: getTime(),
            report: buildReport(data, clean),
          }
        : {
            id: nextId(), role: "bot",
            content: data.message || "Pas de réponse.",
            timestamp: getTime(),
          };

      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: nextId(), role: "bot",
        content: `Erreur : ${e.message}`,
        timestamp: getTime(),
      }]);
    } finally {
      setLoading(false);
      setActiveIOC(null);
    }
  }, [input, loading, selectedModel]);

  const handleNewChat = useCallback(() => {
    _msgId = 1;
    setMessages([makeInitMsg()]);
    setInput("");
    setActiveIOC(null);
    setLoading(false);
  }, []);

  return {
    messages,
    input, setInput,
    loading,
    activeIOC,
    bottomRef,
    handleSelectIOC,
    sendMessage,
    handleNewChat,
  };
}