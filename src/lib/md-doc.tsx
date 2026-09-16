import type { ReactNode } from "react";

/**
 * Узкий рендер markdown для юридических документов.
 * Выход — разметка в стиле doc-rules (как страница реферальных правил):
 * шапка, секции, группы с жёлтым подзаголовком, списки, таблица.
 */

function stripMd(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").trim();
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Ссылки, жирный и инлайн-код — как в остальных legal-страницах.
  const re = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*(.+?)\*\*)|(`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2] && match[3]) {
      parts.push(
        <a key={`${keyPrefix}-a${i++}`} href={match[3]}>
          {match[2]}
        </a>,
      );
    } else if (match[5]) {
      parts.push(<strong key={`${keyPrefix}-b${i++}`}>{match[5]}</strong>);
    } else if (match[7]) {
      parts.push(<code key={`${keyPrefix}-c${i++}`}>{match[7]}</code>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function splitCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isSeparator(line: string): boolean {
  return /^\|?[\s:|-]+\|[\s:|-]*\|?$/.test(line.trim());
}

function isRequisiteField(line: string): boolean {
  return /^(ИНН|ОГРН|ОГРНИП|Адрес)\s*:/i.test(stripMd(line));
}

function isCompanyLine(line: string): boolean {
  const plain = stripMd(line);
  return (
    /Общество с ограниченной/i.test(plain) ||
    /^ООО\b/i.test(plain) ||
    /^ИП\b/i.test(plain)
  );
}

function parseField(line: string): { label: string; value: string } | null {
  const plain = stripMd(line);
  const match = plain.match(/^(ИНН|ОГРН|ОГРНИП|Адрес)\s*:\s*(.+)$/i);
  if (!match) return null;
  return { label: match[1] ?? "", value: match[2] ?? "" };
}

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "meta"; text: string }
  | { kind: "p"; chunks: string[]; breaks: boolean[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; rows: string[] }
  | { kind: "requisites"; title: string; fields: string[] };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Горизонтальные правила MD не рендерим — только разделители в исходнике.
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ kind: "h1", text: line.slice(2) });
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.slice(3) });
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.slice(4) });
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length) {
        const row = lines[i] ?? "";
        if (!row.trim().startsWith("|")) break;
        rows.push(row);
        i += 1;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }

    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length) {
        const row = lines[i] ?? "";
        if (!/^\d+\.\s/.test(row.trim())) break;
        items.push(row.trim().replace(/^\d+\.\s/, ""));
        i += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const row = lines[i] ?? "";
        if (!row.trim().startsWith("- ")) break;
        items.push(row.trim().slice(2));
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (isCompanyLine(line)) {
      const title = line.trim().replace(/\s+$/, "");
      i += 1;
      const fields: string[] = [];
      while (i < lines.length) {
        const row = (lines[i] ?? "").trim();
        if (!row || !isRequisiteField(row)) break;
        fields.push(row);
        i += 1;
      }
      if (fields.length) {
        blocks.push({ kind: "requisites", title, fields });
      } else {
        blocks.push({ kind: "p", chunks: [title], breaks: [false] });
      }
      continue;
    }

    if (/^Редакция\b/i.test(stripMd(line))) {
      blocks.push({ kind: "meta", text: line.trim() });
      i += 1;
      continue;
    }

    const chunks: string[] = [];
    const breaks: boolean[] = [];
    while (i < lines.length) {
      const row = lines[i] ?? "";
      if (
        !row.trim() ||
        row.startsWith("#") ||
        row.trim().startsWith("|") ||
        row.trim().startsWith("- ") ||
        /^\d+\.\s/.test(row.trim()) ||
        isCompanyLine(row)
      ) {
        break;
      }
      breaks.push(/ {2}$/.test(row));
      chunks.push(row.trim());
      i += 1;
    }
    if (chunks.length) {
      blocks.push({ kind: "p", chunks, breaks });
    }
  }

  return blocks;
}

function renderParagraph(
  chunks: string[],
  breaks: boolean[],
  key: string,
): ReactNode {
  const hasHardBreak = breaks.some(Boolean);
  if (hasHardBreak) {
    return (
      <p key={key}>
        {chunks.map((chunk, idx) => (
          <span key={`${key}-${idx}`}>
            {inline(chunk, `${key}-${idx}`)}
            {idx < chunks.length - 1 && breaks[idx] ? <br /> : " "}
          </span>
        ))}
      </p>
    );
  }
  return <p key={key}>{inline(chunks.join(" "), key)}</p>;
}

function renderBodyBlock(block: Block, key: string): ReactNode {
  switch (block.kind) {
    case "p":
      return renderParagraph(block.chunks, block.breaks, key);
    case "ul":
      // Обычный список; текст в одном span, чтобы flex/grid не рвали фразы.
      return (
        <ul key={key} className="referral-rules__bullets">
          {block.items.map((item, idx) => (
            <li key={`${key}-${idx}`}>
              <span>{inline(item, `${key}-${idx}`)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="referral-rules__list">
          {block.items.map((item, idx) => (
            <li key={`${key}-${idx}`} className="referral-rules__item">
              <span className="referral-rules__num">{idx + 1}.</span>
              <p>{inline(item, `${key}-${idx}`)}</p>
            </li>
          ))}
        </ol>
      );
    case "table": {
      const bodyRows = block.rows.filter((row) => !isSeparator(row));
      const headRow = bodyRows[0];
      if (!headRow) return null;
      const head = splitCells(headRow);
      const data = bodyRows.slice(1).map(splitCells);
      return (
        <div key={key} className="referral-rules__table-wrap">
          <table className="referral-rules__table">
            <thead>
              <tr>
                {head.map((cell, i) => (
                  <th key={`${key}-h${i}`}>{inline(cell, `${key}-h${i}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((cells, r) => (
                <tr key={`${key}-r${r}`}>
                  {cells.map((cell, c) => (
                    <td key={`${key}-r${r}c${c}`}>
                      {inline(cell, `${key}-r${r}c${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "requisites": {
      const fields = block.fields
        .map(parseField)
        .filter(
          (field): field is { label: string; value: string } => Boolean(field),
        );
      return (
        <p key={key} className="referral-rules__requisites">
          {inline(block.title, `${key}-n`)}
          {fields.map((field, idx) => (
            <span key={`${key}-f${idx}`}>
              <br />
              {field.label}: <strong>{field.value}</strong>
            </span>
          ))}
        </p>
      );
    }
    default:
      return null;
  }
}

function renderGroupBody(blocks: Block[], keyPrefix: string): ReactNode[] {
  return blocks
    .map((block, idx) => renderBodyBlock(block, `${keyPrefix}-${idx}`))
    .filter(Boolean);
}

function renderGroup(
  title: string,
  body: Block[],
  key: string,
): ReactNode {
  return (
    <div key={key} className="referral-rules__group">
      <h3 className="referral-rules__group-title">
        {inline(title, `${key}-t`)}
      </h3>
      {renderGroupBody(body, key)}
    </div>
  );
}

/**
 * Тот же визуальный контракт, что у referral-rules:
 * шапка, секции, серые группы с жёлтым заголовком, нумерованные пункты.
 */
export function renderMdDoc(
  source: string,
  options?: { backHref?: string; backLabel?: string },
): ReactNode {
  const blocks = parseBlocks(source);
  const head: ReactNode[] = [];
  const body: ReactNode[] = [];
  let i = 0;
  let sid = 0;

  if (blocks[0]?.kind === "h1") {
    head.push(<h1 key="title">{inline(blocks[0].text, "h1")}</h1>);
    i = 1;
  }

  while (i < blocks.length && blocks[i]?.kind !== "h2") {
    const block = blocks[i];
    if (!block) break;
    if (block.kind === "meta") {
      head.push(
        <p key={`meta-${i}`} className="referral-rules__meta">
          {inline(block.text, `meta-${i}`)}
        </p>,
      );
    } else if (block.kind === "p" && head.length <= 2) {
      head.push(
        <p key={`intro-${i}`} className="referral-rules__intro">
          {inline(block.chunks.join(" "), `intro-${i}`)}
        </p>,
      );
    } else {
      const node = renderBodyBlock(block, `head-${i}`);
      if (node) head.push(node);
    }
    i += 1;
  }

  while (i < blocks.length) {
    const h2 = blocks[i];
    if (h2?.kind !== "h2") {
      i += 1;
      continue;
    }
    i += 1;

    const beforeGroups: Block[] = [];
    const groups: { title: string; body: Block[] }[] = [];
    let current: { title: string; body: Block[] } | null = null;

    while (i < blocks.length && blocks[i]?.kind !== "h2") {
      const block = blocks[i];
      if (!block) break;

      if (block.kind === "h3") {
        current = { title: block.text, body: [] };
        groups.push(current);
        i += 1;
        continue;
      }

      if (current) {
        current.body.push(block);
      } else {
        beforeGroups.push(block);
      }
      i += 1;
    }

    // Есть ### — подпункты = серые группы. Вводный текст до первого ###
    // тоже в серой группе с заголовком ##, иначе он «висит» на белом.
    // Нет ### — весь раздел = одна серая группа.
    if (groups.length > 0) {
      body.push(
        <section key={`sec-${sid}`} className="referral-rules__section">
          {beforeGroups.length > 0 ? (
            renderGroup(h2.text, beforeGroups, `g${sid}-pre`)
          ) : (
            <h2>{inline(h2.text, `h2-${sid}`)}</h2>
          )}
          {groups.map((group, gid) =>
            renderGroup(group.title, group.body, `g${sid}-${gid}`),
          )}
        </section>,
      );
    } else {
      body.push(
        renderGroup(h2.text, beforeGroups, `g${sid}`),
      );
    }
    sid += 1;
  }

  return (
    <article className="referral-rules">
      <header className="referral-rules__head">{head}</header>
      {body}
      {options?.backHref ? (
        <footer className="referral-rules__footer">
          <a
            className="btn btn-yellow referral-rules__back"
            href={options.backHref}
          >
            {options.backLabel ?? "Вернуться на главную"}
          </a>
        </footer>
      ) : null}
    </article>
  );
}
