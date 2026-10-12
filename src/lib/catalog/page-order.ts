const defaultOrder = ['ProjectExteriors', 'ProjectPlans', 'ProjectInteriors', 'ProjectBuilt', 'MortgageCalculator', 'ProjectConfig', 'ReadyHomeOffer', 'ProjectNextSteps', 'ProjectSimilar', 'contactsSection']
export async function getProjectPageOrder(slug: string): Promise<string[]> {
  const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
  try {
    const response = await fetch(`${origin}/api/projects/page-order?slug=${encodeURIComponent(slug)}`, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    if (!response.ok) return defaultOrder
    const { order } = await response.json()
    return Array.isArray(order) && order.length === defaultOrder.length && new Set(order).size === order.length && order.every(key => defaultOrder.includes(key)) ? order : defaultOrder
  } catch { return defaultOrder }
}
