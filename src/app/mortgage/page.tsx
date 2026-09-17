import { permanentRedirect } from "next/navigation";
import { mortgageHref, programBySlug } from "../../lib/mortgage";
import type { MortgageProgramId } from "../../lib/mortgage";

/**
 * Прежний адрес программ.
 *
 * Оставлен переадресацией, а не удалён: на /mortgage ведут внешние ссылки и
 * закладки, а вид /mortgage?program=it был единственным способом открыть
 * конкретную программу. Параметр разбирается и уводит на её собственный
 * адрес, без параметра — на семейную, она же и была содержимым страницы.
 *
 * Переадресация постоянная: адрес сменился навсегда, и держать старый в
 * индексе поисковым системам незачем.
 */
const PROGRAM_IDS: readonly MortgageProgramId[] = [
  "family",
  "it",
  "rural",
  "market",
];

export default async function MortgageRedirect({
  searchParams,
}: {
  searchParams: Promise<{ program?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.program) ? params.program[0] : params.program;

  // Принимаем и прежние идентификаторы, и новые слаги: ссылка вида
  // /mortgage?program=it-mortgage тоже доедет куда нужно.
  const byId = PROGRAM_IDS.find((id) => id === raw);
  const bySlug = raw ? programBySlug(raw) : undefined;

  permanentRedirect(mortgageHref(byId ?? bySlug ?? "family"));
}
