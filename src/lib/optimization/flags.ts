/** Fail closed: unset, malformed and legacy truthy strings never enable the module. */
export function optimizationFlags(env: Record<string, string | undefined> = process.env) {
  const enabled = env.OPTIMIZATION_ENABLED === 'true'
  return {
    enabled,
    events: enabled && env.OPTIMIZATION_EVENTS_ENABLED === 'true',
    ranking: enabled && env.OPTIMIZATION_RANKING_ENABLED === 'true',
    preferences: enabled && env.OPTIMIZATION_PREFERENCES_ENABLED === 'true',
  }
}
