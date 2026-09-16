import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { CONSENT_VERSION, type ConsentAction } from "../../../consent/types";

/**
 * Audit trail согласий. БД в контуре ещё нет — пишем JSONL в data/.
 * Когда появится Prisma/Payload, заменить адаптер без смены контракта API.
 */

type Body = {
  action?: ConsentAction;
  consentVersion?: string;
  functional?: boolean;
  analytics?: boolean;
  marketing?: boolean;
  pageUrl?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const action = body.action;
  if (
    action !== "accept_all" &&
    action !== "necessary_only" &&
    action !== "save_custom" &&
    action !== "update" &&
    action !== "revoke_optional"
  ) {
    return NextResponse.json({ error: "bad-action" }, { status: 400 });
  }

  const event = {
    id: randomUUID(),
    consentVersion: body.consentVersion || CONSENT_VERSION,
    createdAt: new Date().toISOString(),
    action,
    necessary: true as const,
    functional: Boolean(body.functional),
    analytics: Boolean(body.analytics),
    marketing: Boolean(body.marketing),
    pageUrl: String(body.pageUrl || "").slice(0, 2000),
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      undefined,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || undefined,
  };

  try {
    const dir = join(process.cwd(), "data");
    await mkdir(dir, { recursive: true });
    await appendFile(
      join(dir, "cookie-consent-events.jsonl"),
      `${JSON.stringify(event)}\n`,
      "utf8",
    );
  } catch {
    // Диск недоступен (read-only image) — не валим запрос пользователя.
    console.info("[consent-audit]", event.id, event.action);
  }

  return NextResponse.json({ ok: true, id: event.id });
}
