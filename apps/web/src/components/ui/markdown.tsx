import { Fragment } from "react";

/** Markdown-lite for replies: **bold**, _italic_, `code`, bullet lists, links, line breaks. Nothing else — no HTML ever rendered. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`l${blocks.length}`} className="my-1 list-disc space-y-0.5 pl-5">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((line, i) => {
    const m = /^\s*[-*]\s+(.*)$/.exec(line);
    if (m) {
      list.push(m[1]!);
      return;
    }
    flush();
    if (line.trim() === "") blocks.push(<div key={`b${i}`} className="h-2" />);
    else blocks.push(<p key={`p${i}`}>{inline(line)}</p>);
  });
  flush();
  return <div className={className}>{blocks}</div>;
}

function inline(s: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(<Fragment key={k++}>{s.slice(last, m.index)}</Fragment>);
    const t = m[0];
    if (t.startsWith("**")) parts.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("_")) parts.push(<em key={k++}>{t.slice(1, -1)}</em>);
    else if (t.startsWith("`")) parts.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const label = t.slice(1, t.indexOf("]"));
      parts.push(<a key={k++} href={m[2]} target="_blank" rel="noreferrer" className="text-accent-ink underline underline-offset-2">{label}</a>);
    } else parts.push(<a key={k++} href={t} target="_blank" rel="noreferrer" className="text-accent-ink underline underline-offset-2">{t}</a>);
    last = m.index + t.length;
  }
  if (last < s.length) parts.push(<Fragment key={k++}>{s.slice(last)}</Fragment>);
  return parts;
}
