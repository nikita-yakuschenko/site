import type { ReactNode } from "react";

/**
 * Узкий рендер markdown для юридических документов: заголовки, абзацы,
 * списки, таблицы GFM и **жирный**. Без внешних зависимостей — документ
 * лежит в docs/ и читается на сборке.
 */

function stripMd(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").trim();
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(<strong key={`${keyPrefix}-b${i++}`}>{match[1]}</strong>);
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

function renderRequisites(
  titleLine: string,
  fieldLines: string[],
  key: string,
): ReactNode {
  const fields = fieldLines
    .map(parseField)
    .filter((field): field is { label: string; value: string } => Boolean(field));

  return (
    <p key={key} className="legal-doc__requisites">
      {inline(titleLine, `${key}-n`)}
      {fields.map((field, idx) => (
        <span key={`${key}-f${idx}`}>
          <br />
          {field.label}: <strong>{field.value}</strong>
        </span>
      ))}
    </p>
  );
}

function renderTable(rows: string[], key: string): ReactNode {
  const bodyRows = rows.filter((row) => !isSeparator(row));
  const headRow = bodyRows[0];
  if (!headRow) return null;
  const head = splitCells(headRow);
  const data = bodyRows.slice(1).map(splitCells);
  return (
    <div key={key} className="legal-doc__table-wrap">
      <table className="legal-doc__table">
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

export function renderMdDoc(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let block = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={`b${block++}`}>{inline(line.slice(2), `h1-${block}`)}</h1>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={`b${block++}`}>{inline(line.slice(3), `h2-${block}`)}</h2>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={`b${block++}`}>{inline(line.slice(4), `h3-${block}`)}</h3>,
      );
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const table: string[] = [];
      while (i < lines.length) {
        const row = lines[i] ?? "";
        if (!row.trim().startsWith("|")) break;
        table.push(row);
        i += 1;
      }
      nodes.push(renderTable(table, `t${block++}`));
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
      const listKey = block++;
      nodes.push(
        <ol key={`b${listKey}`} className="legal-doc__list">
          {items.map((item, idx) => (
            <li key={`o${listKey}-${idx}`}>
              {inline(item, `o${listKey}-${idx}`)}
            </li>
          ))}
        </ol>,
      );
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
      const listKey = block++;
      nodes.push(
        <ul key={`b${listKey}`} className="legal-doc__list">
          {items.map((item, idx) => (
            <li key={`u${listKey}-${idx}`}>
              {inline(item, `u${listKey}-${idx}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Реквизиты оператора: название + ИНН / ОГРН / адрес отдельной карточкой.
    if (isCompanyLine(line)) {
      const titleLine = line.trim().replace(/\s+$/, "");
      i += 1;
      const fields: string[] = [];
      while (i < lines.length) {
        const row = (lines[i] ?? "").trim();
        if (!row) break;
        if (!isRequisiteField(row)) break;
        fields.push(row);
        i += 1;
      }
      if (fields.length) {
        nodes.push(renderRequisites(titleLine, fields, `req${block++}`));
        continue;
      }
      // Название без полей — обычный абзац.
      nodes.push(
        <p key={`b${block++}`}>{inline(titleLine, `p${block}`)}</p>,
      );
      continue;
    }

    // Дата редакции — компактная мета, не «жирный абзац».
    if (/^Редакция\b/i.test(stripMd(line))) {
      nodes.push(
        <p key={`b${block++}`} className="legal-doc__meta">
          {inline(line.trim(), `meta-${block}`)}
        </p>,
      );
      i += 1;
      continue;
    }

    // Абзац: склеиваем соседние непустые строки без разметки блока.
    // Жёсткий перенос markdown (два пробела в конце) сохраняем через <br />.
    const para: string[] = [];
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
      const hardBreak = / {2}$/.test(row);
      para.push(row.trim());
      breaks.push(hardBreak);
      i += 1;
      // Без жёсткого переноса соседняя строка — продолжение того же абзаца.
      if (!hardBreak) {
        // продолжаем собирать, пока строки идут подряд
      }
    }

    const paraKey = block++;
    const hasHardBreak = breaks.some(Boolean);
    if (hasHardBreak) {
      nodes.push(
        <p key={`b${paraKey}`}>
          {para.map((chunk, idx) => (
            <span key={`p${paraKey}-${idx}`}>
              {inline(chunk, `p${paraKey}-${idx}`)}
              {idx < para.length - 1 && breaks[idx] ? <br /> : " "}
            </span>
          ))}
        </p>,
      );
    } else {
      nodes.push(
        <p key={`b${paraKey}`}>{inline(para.join(" "), `p${paraKey}`)}</p>,
      );
    }
  }

  return nodes;
}
