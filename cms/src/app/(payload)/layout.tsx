import '@payloadcms/next/css'
import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import type { ServerFunctionClient } from 'payload'
import type { ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { importMap } from './importMap'
import './shadcn.css'
import './custom.css'
import './tables.css'

const serverFunction: ServerFunctionClient = async (args) => {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

export default function Layout({ children }: { children: ReactNode }) {
  return <RootLayout config={config} htmlProps={{ className: `${GeistSans.variable} ${GeistMono.variable} avgst-admin` }} importMap={importMap} serverFunction={serverFunction}>{children}</RootLayout>
}
