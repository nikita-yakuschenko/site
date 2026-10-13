export const projectBlockOrder = ['ProjectExteriors', 'ProjectPlans', 'ProjectInteriors', 'ProjectBuilt', 'MortgageCalculator', 'ProjectConfig', 'ReadyHomeOffer', 'ProjectNextSteps', 'ProjectSimilar', 'contactsSection']
export const completeProjectOrder = (value: unknown): value is string[] => Array.isArray(value) && value.length === projectBlockOrder.length && new Set(value).size === value.length && value.every(key => typeof key === 'string' && projectBlockOrder.includes(key))

export const normalizeProjectOrder = (value: unknown): string[] => completeProjectOrder(value) ? [...value.filter(key => key !== 'contactsSection'), 'contactsSection'] : [...projectBlockOrder]
export const validProjectOrder = (value: unknown): value is string[] => completeProjectOrder(value) && value.at(-1) === 'contactsSection'
