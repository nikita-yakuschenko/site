import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { CONSENT_VERSION, type ConsentAction } from "../../../consent/types";
import { PREFERENCE_COOKIE, PREFERENCE_VOTER_COOKIE } from '../../../lib/optimization/preference-identity';
import { OPTIMIZATION_CONTEXT_COOKIE } from '../../../lib/optimization/server-context';

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

  const response = NextResponse.json({ ok: true, id: event.id });
  if (body.analytics === false && request.headers.get('origin') === new URL(request.url).origin) {
    response.cookies.set(OPTIMIZATION_CONTEXT_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  }
  // HttpOnly preference identifiers can only be cleared by a server response.
  if (body.functional === false && request.headers.get('origin') === new URL(request.url).origin) {
    for (const name of [PREFERENCE_COOKIE, PREFERENCE_VOTER_COOKIE]) {
      response.cookies.set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
    }
  }
  return response;
}
