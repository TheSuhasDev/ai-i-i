import { useCallback, useEffect, useRef, useState } from "react";
import { assistantService } from "../services";

export default function useAssistantChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const lastQuestionRef = useRef("");

  useEffect(() => {
    assistantService.status().then((r) => setConfigured(r.data.data.configured)).catch(() => {});
  }, []);

  const _ask = useCallback(async (next) => {
    setBusy(true);
    setError("");
    try {
      const history = next.slice(-11).map(({ role, content }) => ({ role, content }));
      const r = await assistantService.ask(history);
      const d = r.data.data;
      setMessages([...next, { role: "assistant", content: d.answer, toolCalls: d.toolCalls }]);
    } catch (e) {
      setError(
        e.response?.status === 429
          ? "The assistant is busy right now. Please wait a moment and try again."
          : "Couldn't get an answer. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const send = useCallback(async (text) => {
    const q = text.trim();
    if (!q || busy || !configured) return;
    lastQuestionRef.current = q;
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    await _ask(next);
  }, [_ask, busy, configured, messages]);

  const retry = useCallback(() => {
    if (busy || !lastQuestionRef.current) return;
    // Remove the last user message (which has no assistant reply yet) and resend.
    const lastUser = messages.findLastIndex((m) => m.role === "user");
    const base = lastUser >= 0 ? messages.slice(0, lastUser) : messages;
    const q = lastQuestionRef.current;
    const next = [...base, { role: "user", content: q }];
    setMessages(next);
    _ask(next);
  }, [_ask, busy, messages]);

  return { messages, input, setInput, busy, error, configured, send, retry };
}
