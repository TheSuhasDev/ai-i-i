import { useEffect, useRef, useState } from "react";
import { assistantService } from "../services";
import { errorMessage } from "../services/api";

const EXAMPLES = [
  "Which products should I reorder today?",
  "Which suppliers have the most delays?",
  "Which products are overstocked?",
  "What happens if demand increases by 20%?",
  "Why is the USB Hub marked as critical?",
];

function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
  );
}

function Body({ lines }) {
  const out = [];
  let list = [];
  const flush = () => {
    if (list.length) {
      out.push(<ul key={`u${out.length}`}>{list.map((t, i) => <li key={i}><Inline text={t} /></li>)}</ul>);
      list = [];
    }
  };
  lines.forEach((raw) => {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) list.push(bullet[1]);
    else {
      flush();
      if (line) out.push(<p key={`p${out.length}`}><Inline text={line} /></p>);
    }
  });
  flush();
  return <>{out}</>;
}

// Splits the answer into its "Facts" and "Recommendation" sections.
function parseAnswer(text) {
  const sections = [];
  let cur = null;
  text.split("\n").forEach((line) => {
    const m = line.match(/^#{1,4}\s*(facts?|recommendations?)\b/i);
    if (m) {
      cur = { kind: m[1].toLowerCase().startsWith("fact") ? "facts" : "recommendation", lines: [] };
      sections.push(cur);
    } else {
      if (!cur) {
        cur = { kind: "other", lines: [] };
        sections.push(cur);
      }
      cur.lines.push(line);
    }
  });
  return sections.filter((s) => s.lines.join("").trim());
}

const LABELS = {
  facts: "Facts from your system data",
  recommendation: "AI-generated suggestion (verify before acting)",
  other: "Answer",
};

function Answer({ message }) {
  return (
    <div className="msg assistant">
      {parseAnswer(message.content).map((s, i) => (
        <div key={i} className={`answer-section ${s.kind}`}>
          <div className="answer-label">{LABELS[s.kind]}</div>
          <Body lines={s.lines} />
        </div>
      ))}
      {message.toolCalls?.length > 0 && (
        <details className="used">
          <summary>Data used ({message.toolCalls.length} lookups)</summary>
          <ul>
            {message.toolCalls.map((t, i) => (
              <li key={i}>
                <code>{t.name}({Object.keys(t.input || {}).length ? JSON.stringify(t.input) : ""})</code>
                {t.ok ? "" : " (failed)"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    assistantService.status().then((r) => setConfigured(r.data.data.configured)).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const history = next.slice(-11).map(({ role, content }) => ({ role, content }));
      const r = await assistantService.ask(history);
      const d = r.data.data;
      setMessages([...next, { role: "assistant", content: d.answer, toolCalls: d.toolCalls }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat">
      <div className="page-head"><h2>AI Inventory Assistant</h2></div>
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

      <div className="chips">
        {EXAMPLES.map((q) => (
          <button key={q} className="chip" disabled={busy || !configured} onClick={() => send(q)}>{q}</button>
        ))}
      </div>

      <div className="chat-window">
        {messages.length === 0 && <p className="muted">Pick an example above or type a question.</p>}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="msg user">{m.content}</div>
          ) : (
            <Answer key={i} message={m} />
          )
        )}
        {busy && <p className="muted">Looking up your data...</p>}
        <div ref={endRef} />
      </div>

      {error && <div className="alert">{error}</div>}

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your inventory..."
          maxLength={2000}
          disabled={busy || !configured}
        />
        <button className="btn primary" disabled={busy || !configured || !input.trim()}>Send</button>
      </form>
    </div>
  );
}