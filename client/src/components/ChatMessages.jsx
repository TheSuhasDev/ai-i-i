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
  text.split("\n").forEach((line) => {
    const match = line.match(/^#{1,4}\s*(facts?|recommendations?)\b/i);
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
        <details className="used">
          <summary>Data used ({message.toolCalls.length} lookups)</summary>
          <ul>
            {message.toolCalls.map((tool, i) => (
              <li key={i}>
                <code>{tool.name}({Object.keys(tool.input || {}).length ? JSON.stringify(tool.input) : ""})</code>
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
      {messages.length === 0 && emptyText && <p className="muted">{emptyText}</p>}
      {messages.map((message, i) => message.role === "user"
        ? <div key={i} className="msg user">{message.content}</div>
        : <Answer key={i} message={message} />)}
      {busy && <p className="muted assistant-loading">Looking up your data...</p>}
      <div ref={endRef} />
    </div>
  );
}
