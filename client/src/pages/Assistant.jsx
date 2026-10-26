import { SUGGESTED_QUESTIONS } from "../context/assistantChatContext";
import useAssistantChatContext from "../hooks/useAssistantChatContext";
import ChatMessages from "../components/ChatMessages";
import PageHeader from "../components/PageHeader";

export default function Assistant() {
  const { messages, input, setInput, busy, error, configured, send, retry } = useAssistantChatContext();

  return (
    <div className="chat">
      <PageHeader title="AI Inventory Assistant" subtitle="Ask questions about inventory, forecasts, suppliers, and reorder decisions." />
      <p className="muted">
        Ask about reorders, suppliers, overstock, what-if scenarios or why a product is critical. Answers are built from live lookups in
        your inventory system. Blue blocks are facts from stored data; orange blocks are the assistant's own suggestions.
        It can read data but cannot change anything.
      </p>

      {!configured && (
        <div className="alert">
          The assistant is not set up. Add ANTHROPIC_API_KEY to server/.env and restart the server.
        </div>
      )}

      <section className="card chat-card" aria-label="Inventory assistant chat">
        <div className="chips">
          {SUGGESTED_QUESTIONS.map((question) => (
            <button key={question} className="chip" disabled={busy || !configured} onClick={() => send(question)}>{question}</button>
          ))}
        </div>
        <ChatMessages messages={messages} busy={busy} emptyText="Pick an example above or type a question." />
        {error && (
          <div className="alert chat-error" role="alert">
            {error}
            <button className="btn small" onClick={retry} disabled={busy}>Retry</button>
          </div>
        )}
        <form className="chat-input" onSubmit={(event) => { event.preventDefault(); send(input); }}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question about your inventory..."
            maxLength={2000}
            disabled={busy || !configured}
          />
          <button className="btn primary" disabled={busy || !configured || !input.trim()}>Send</button>
        </form>
      </section>
    </div>
  );
}
