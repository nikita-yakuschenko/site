import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false } }
export default function PreviewLayout({ children }: { children: React.ReactNode }) { return <div className="configuration-site-preview">{children}<style>{`body:has(.configuration-site-preview) .cookie-banner { display: none; }`}</style></div> }
