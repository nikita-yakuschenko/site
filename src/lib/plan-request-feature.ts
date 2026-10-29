/** Production builds cannot enable this local prototype, even with the flag set. */
export const planRequestDemoEnabled = () => process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_PLAN_REQUEST_DEMO === '1'
export const planRequestFixturesEnabled = () => planRequestDemoEnabled() && process.env.PLAN_REQUEST_DEMO_FIXTURES === '1'
