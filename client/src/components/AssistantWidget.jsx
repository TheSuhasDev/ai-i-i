import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SUGGESTED_QUESTIONS } from "../context/assistantChatContext";
import useAssistantChatContext from "../hooks/useAssistantChatContext";
import ChatMessages from "./ChatMessages";

export default function AssistantWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { messages, input, setInput, busy, error, configured, send, retry } = useAssistantChatContext();
  const onAssistantPage = location.pathname === "/assistant";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (onAssistantPage) return null;

  const submit = () => send(input);
  return (
    <div className="assistant-widget">
      {open && (
        <section className="assistant-widget-panel" id="assistant-widget-panel" role="dialog" aria-labelledby="assistant-widget-title">
          <header className="assistant-widget-header">
            <div>
              <h2 id="assistant-widget-title">Inventory Assistant</h2>
              <Link to="/assistant" onClick={() => setOpen(false)}>Open full page</Link>
            </div>
            <button type="button" className="assistant-widget-close" aria-label="Close AI assistant" title="Close" onClick={() => setOpen(false)}>×</button>
          </header>

          {!configured && <p className="assistant-widget-unavailable" role="status">The assistant is not configured yet.</p>}
          {messages.length === 0 && configured && (
            <div className="chips assistant-widget-suggestions" aria-label="Suggested questions">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button key={question} type="button" className="chip" disabled={busy} onClick={() => send(question)}>{question}</button>
              ))}
            </div>
          )}

          <ChatMessages messages={messages} busy={busy} emptyText={configured ? "Choose a question or ask about your inventory." : ""} className="assistant-widget-messages" />
          {error && (
            <div className="alert assistant-widget-error" role="alert">
              {error}
              <button type="button" className="btn small" onClick={retry} disabled={busy}>Retry</button>
            </div>
          )}

          {configured && (
            <form className="chat-input assistant-widget-input" onSubmit={(event) => { event.preventDefault(); submit(); }}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder="Ask a question..."
                aria-label="Ask the AI assistant"
                maxLength={2000}
                rows={2}
                disabled={busy}
              />
              <button type="submit" className="btn primary" aria-label="Send message" disabled={busy || !input.trim()}>Send</button>
            </form>
          )}
        </section>
      )}

      <button
        type="button"
        className={`assistant-widget-button ${open ? "is-open" : ""}`}
        aria-label={open ? "Close AI Assistant" : "Ask AI Assistant"}
        aria-expanded={open}
        aria-controls="assistant-widget-panel"
        title="Ask AI Assistant"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-6a7.5 7.5 0 1 1 17-3.5Z" />
          <path d="m12 5 .9 2.7L15.5 9l-2.6.9L12 12.5l-.9-2.6L8.5 9l2.6-1.3L12 5Zm4 8 .5 1.5L18 15l-1.5.5L16 17l-.5-1.5L14 15l1.5-.5L16 13Z" />
        </svg>
      </button>
    </div>
  );
}
