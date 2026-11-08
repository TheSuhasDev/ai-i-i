import { SUGGESTED_QUESTIONS } from "../context/assistantChatContext";
import useAssistantChatContext from "../hooks/useAssistantChatContext";
import ChatMessages from "../components/ChatMessages";
import PageHeader from "../components/PageHeader";

export default function Assistant() {
  const { messages, input, setInput, busy, error, configured, send, retry, clear } = useAssistantChatContext();

  return (
    <div className="assistant-page mx-auto w-full max-w-6xl px-3 sm:px-6 py-4 flex flex-col">
      <PageHeader
        className="!mb-0 shrink-0"
        title="AI Inventory Assistant"
        subtitle="Ask questions about inventory, reorders, suppliers, overstock, and what-if scenarios. Grounded in live system data (blue blocks are system facts; orange blocks are AI suggestions)."
        actions={
          <button
            type="button"
            className="btn small"
            onClick={clear}
            disabled={busy || messages.length === 0}
            title="Clear all messages in the conversation"
          >
            Clear chat
          </button>
        }
      />

      {!configured && (
        <div className="alert mt-3 shrink-0" role="alert">
          The assistant is not set up. Add LLM_API_KEY to server/.env and restart the server.
        </div>
      )}

      <section
        className="card mt-3 flex-1 min-h-0 flex flex-col rounded-2xl border p-3 sm:p-5 overflow-hidden"
        aria-label="Inventory assistant chat"
      >
        {messages.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-4 md:p-8 overflow-y-auto">
            <div className="assistant-empty-badge">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <span>AI Decision Support</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-[var(--text)] mb-2">How can I assist your inventory decisions?</h3>
            <p className="text-sm text-[var(--muted)] max-w-lg mb-6">
              Pick a suggested question below or ask anything about your stock, reorders, suppliers, or forecasts.
            </p>
            <div className="assistant-empty-chips" role="group" aria-label="Suggested questions">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="chip assistant-empty-chip"
                  disabled={busy || !configured}
                  onClick={() => send(question)}
                >
                  <span className="text-[var(--accent)] font-bold">✦</span>
                  <span>{question}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)] shrink-0 text-xs text-[var(--muted)]">
              <span>{messages.length} message{messages.length === 1 ? "" : "s"} in session</span>
              <button
                type="button"
                className="btn small !text-xs !py-1 !px-2.5"
                onClick={clear}
                disabled={busy}
              >
                Clear chat
              </button>
            </div>
            <ChatMessages
              className="flex-1 min-h-0 overflow-y-auto"
              messages={messages}
              busy={busy}
            />
          </div>
        )}

        {error && (
          <div className="alert chat-error my-2 shrink-0" role="alert">
            <span>{error}</span>
            <button className="btn small" onClick={retry} disabled={busy}>Retry</button>
          </div>
        )}

        <form
          className="chat-input-bar mt-3 pt-3 border-t border-[var(--border)] flex gap-2 sm:gap-3 shrink-0 items-center"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <input
            className="flex-1 text-sm py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors min-w-0"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask a question about your inventory (Enter to send)..."
            maxLength={2000}
            disabled={busy || !configured}
            aria-label="Ask a question about your inventory"
          />
          <button
            type="submit"
            className="btn primary shrink-0 flex items-center gap-1.5 px-4"
            disabled={busy || !configured || !input.trim()}
          >
            {busy ? (
              <span>Sending...</span>
            ) : (
              <>
                <span>Send</span>
                <span aria-hidden="true">↵</span>
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
