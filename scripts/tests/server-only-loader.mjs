// Match Next's server-only marker alias without adding a runtime dependency.
export async function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === 'server-only' ? 'next/dist/compiled/server-only/empty.js' : specifier, context)
}
