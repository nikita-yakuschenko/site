import type { ConsentCategory } from "./types";

export interface ConsentIntegration {
  id: string;
  category: ConsentCategory;
  /** Подключить сервис после согласия. */
  init?: () => void | Promise<void>;
  /** Остановить и по возможности отозвать. */
  revoke?: () => void | Promise<void>;
}

const integrations = new Map<string, ConsentIntegration>();

export function registerIntegration(integration: ConsentIntegration): void {
  integrations.set(integration.id, integration);
}

export function getIntegrationsByCategory(
  category: ConsentCategory,
): ConsentIntegration[] {
  return [...integrations.values()].filter((item) => item.category === category);
}

export function getAllIntegrations(): ConsentIntegration[] {
  return [...integrations.values()];
}

export async function initCategory(category: ConsentCategory): Promise<void> {
  for (const item of getIntegrationsByCategory(category)) {
    await item.init?.();
  }
}

export async function revokeCategoryIntegrations(
  category: ConsentCategory,
): Promise<void> {
  for (const item of getIntegrationsByCategory(category)) {
    await item.revoke?.();
  }
}
