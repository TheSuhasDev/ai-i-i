import { useEffect, useRef } from "react";

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

function parseAnswer(text) {
  const sections = [];
  let cur = null;
  (text || "").split("\n").forEach((line) => {
    const clean = line.replace(/^[*_#\s]+/, "").trim();
    const match = clean.match(/^(facts?|recommendations?)\b/i);
    if (match) {
      cur = { kind: match[1].toLowerCase().startsWith("fact") ? "facts" : "recommendation", lines: [] };
      sections.push(cur);
    } else {
      if (!cur) {
        cur = { kind: "other", lines: [] };
        sections.push(cur);
      }
      cur.lines.push(line);
    }
  });
  return sections.filter((section) => section.lines.join("").trim());
}

const LABELS = {
  facts: "Facts from your system data",
  recommendation: "AI-generated suggestion (verify before acting)",
  other: "Answer",
};

function Answer({ message }) {
  return (
    <div className="msg assistant">
      {parseAnswer(message.content).map((section, i) => (
        <div key={i} className={`answer-section ${section.kind}`}>
          <div className="answer-label">{LABELS[section.kind]}</div>
          <Body lines={section.lines} />
        </div>
      ))}
      {message.toolCalls?.length > 0 && (
        <details className="used mt-2 text-xs">
          <summary className="cursor-pointer select-none text-[var(--muted)] hover:text-[var(--text)]">
            Data used ({message.toolCalls.length} lookup{message.toolCalls.length === 1 ? "" : "s"})
          </summary>
          <ul className="mt-1 pl-4 space-y-0.5">
            {message.toolCalls.map((tool, i) => (
              <li key={i}>
                <code className="text-xs">{tool.name}({Object.keys(tool.input || {}).length ? JSON.stringify(tool.input) : ""})</code>
                {tool.ok ? "" : " (failed)"}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function ChatMessages({ messages, busy, emptyText = "", className = "" }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  return (
    <div className={`chat-window ${className}`} aria-live="polite">
      {messages.length === 0 && emptyText && <p className="muted text-sm">{emptyText}</p>}
      {messages.map((message, i) => (
        <div key={i} className={`msg-row ${message.role}`}>
          {message.role === "user" ? (
            <div className="msg user">
              <span className="msg-text">{message.content}</span>
            </div>
          ) : (
            <Answer message={message} />
          )}
        </div>
      ))}
      {busy && (
        <div className="msg-row assistant">
          <div className="msg assistant loading-bubble" role="status" aria-label="Loading response">
            <div className="typing-dots" aria-hidden="true">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <span className="loading-text">Looking up live system data...</span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
