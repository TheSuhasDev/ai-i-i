import { useCallback, useEffect, useRef, useState } from "react";
import { assistantService } from "../services";

export default function useAssistantChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const busyRef = useRef(false);
  const lastQuestionRef = useRef("");

  useEffect(() => {
    assistantService
      .status()
      .then((r) => setConfigured(Boolean(r.data?.data?.configured)))
      .catch(() => {});
  }, []);

  const _ask = useCallback(async (next) => {
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const history = next.slice(-11).map(({ role, content }) => ({ role, content }));
      const r = await assistantService.ask(history);
      const d = r.data?.data;
      if (!d) throw new Error("Empty response received");
      setMessages([...next, { role: "assistant", content: d.answer, toolCalls: d.toolCalls }]);
    } catch (e) {
      const status = e.response?.status;
      const apiMsg = e.response?.data?.message;
      if (status === 429) {
        setError(apiMsg || "The assistant is busy right now. Please wait a moment and try again.");
      } else {
        setError(apiMsg || "Couldn't get an answer. Please try again.");
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const send = useCallback(async (text) => {
    const q = (text || "").trim();
    if (!q || busyRef.current || busy || !configured) return;
    if (q.length > 2000) {
      setError("Please keep your question under 2,000 characters.");
      return;
    }
    lastQuestionRef.current = q;
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    await _ask(next);
  }, [_ask, busy, configured, messages]);

  const retry = useCallback(() => {
    if (busyRef.current || busy || !lastQuestionRef.current) return;
    const lastUser = messages.findLastIndex((m) => m.role === "user");
    const base = lastUser >= 0 ? messages.slice(0, lastUser) : messages;
    const q = lastQuestionRef.current;
    const next = [...base, { role: "user", content: q }];
    setMessages(next);
    _ask(next);
  }, [_ask, busy, messages]);

  const clear = useCallback(() => {
    if (busyRef.current || busy) return;
    setMessages([]);
    setError("");
    lastQuestionRef.current = "";
  }, [busy]);

  return { messages, input, setInput, busy, error, configured, send, retry, clear };
}
