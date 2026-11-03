import { SUGGESTED_QUESTIONS } from "../context/assistantChatContext";
import useAssistantChatContext from "../hooks/useAssistantChatContext";
import ChatMessages from "../components/ChatMessages";
import PageHeader from "../components/PageHeader";

export default function Assistant() {
  const { messages, input, setInput, busy, error, configured, send, retry } = useAssistantChatContext();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-8">
      <PageHeader
        title="AI Inventory Assistant"
        subtitle="Ask questions about inventory, forecasts, suppliers, and reorder decisions."
      />
      <p className="muted max-w-3xl text-sm leading-relaxed">
        Ask about reorders, suppliers, overstock, what-if scenarios or why a product is critical. Answers are built from live lookups in
        your inventory system. Blue blocks are facts from stored data; orange blocks are the assistant's own suggestions.
        It can read data but cannot change anything.
      </p>

      {!configured && (
        <div className="alert mt-4">
          The assistant is not set up. Add ANTHROPIC_API_KEY to server/.env and restart the server.
        </div>
      )}

      <section
        className="card mt-6 flex h-[calc(100vh-18rem)] min-h-[480px] flex-col rounded-2xl border p-4"
        aria-label="Inventory assistant chat"
      >
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              className="chip"
              disabled={busy || !configured}
              onClick={() => send(question)}
            >
              {question}
            </button>
          ))}
        </div>
        <ChatMessages
          className="flex-1 overflow-y-auto mt-4"
          messages={messages}
          busy={busy}
          emptyText="Pick an example above or type a question."
        />
        {error && (
          <div className="alert chat-error my-2" role="alert">
            {error}
            <button className="btn small" onClick={retry} disabled={busy}>Retry</button>
          </div>
        )}
        <form
          className="mt-4 flex gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <input
            className="flex-1"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question about your inventory..."
            maxLength={2000}
            disabled={busy || !configured}
          />
          <button className="btn primary" disabled={busy || !configured || !input.trim()}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
