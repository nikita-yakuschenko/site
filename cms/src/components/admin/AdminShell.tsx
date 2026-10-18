'use client'

import { useAuth, useNav, usePreferences, useTheme } from '@payloadcms/ui'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { IconExternalLink as ExternalLink, IconPhoto as Images, IconLayoutDashboard as LayoutDashboard, IconLogout as LogOut, IconDotsVertical as MoreVertical, IconSettings as Settings, IconSun as Sun, IconMoon as Moon, IconUsers as Users } from '@tabler/icons-react'
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { User } from '../../payload-types'
import { structure } from '../../config/structure'
import { IconWorld, IconFiles, IconBuildingCommunity, IconCash, IconDatabase, IconFlask, IconBlocks, IconForms, IconSitemap, IconPlugConnected } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Separator } from '../ui/separator'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '../ui/sidebar'
import { catalogHref } from './catalog-query'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../ui/breadcrumb'

export function EmptyNav() { return null }

const structureIcons = { site: IconWorld, pages: IconFiles, catalog: IconBuildingCommunity, prices: IconCash, registers: IconDatabase, sampling: IconFlask, blocks: IconBlocks, forms: IconForms, sections: IconSitemap, integrations: IconPlugConnected }
const documentsOf: Record<string, string> = { '/pages': '/collections/pages', '/catalog': '/collections/projects', '/prices': '/collections/project-prices' }
function sectionPaths(href: string) {
  if (href === '/integrations') return [href, '/leads', '/collections/lead-submissions', '/globals/lead-delivery']
  return documentsOf[href] ? [href, documentsOf[href]] : [href]
}
function sectionActive(pathname: string, href: string) {
  return sectionPaths(href).some(path => pathname === path || pathname.startsWith(`${path}/`))
}
const navigation = [
  { title: 'Сайт', items: [{ title: 'Обзор', href: '/', icon: LayoutDashboard }, ...structure.filter(item => item.key !== 'integrations').map(item => ({ ...item, icon: structureIcons[item.key] }))] },
  { title: 'Обмен данными', items: structure.filter(item => item.key === 'integrations').map(item => ({ ...item, icon: structureIcons[item.key] })) },
  { title: 'Администрирование', items: [
    { title: 'Медиафайлы', href: '/collections/media', icon: Images, collection: 'media' },
    { title: 'Пользователи', href: '/collections/users', icon: Users, collection: 'users' },
  ] },
]

function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, permissions } = useAuth<User>()
  const { setOpenMobile } = useSidebar()
  if (!user) return null
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  return <Sidebar variant="inset" collapsible="icon">
    <SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild className="h-12" tooltip="Авангард Строй 4.0">
      <Link href="/" onClick={() => setOpenMobile(false)}><Image src="/favicon.svg" width={32} height={32} alt="" /><span className="font-semibold">Авангард Строй 4.0</span></Link>
    </SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader>
    <SidebarContent>{navigation.map(group => <SidebarGroup key={group.title}><SidebarGroupLabel>{group.title}</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>
      {group.items.filter(item => !('collection' in item) || permissions?.collections?.[item.collection as 'users' | 'media']?.read).map(item => <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={item.href === '/' ? pathname === '/' : sectionActive(pathname, item.href)} tooltip={item.title}>
          <Link href={item.href} onClick={event => { setOpenMobile(false); if (item.href !== '/catalog') return; const href = catalogHref(); if (href === item.href) return; event.preventDefault(); router.push(href) }}><item.icon /><span>{item.title}</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>)}
    </SidebarMenu></SidebarGroupContent></SidebarGroup>)}
    <SidebarGroup className="mt-auto"><SidebarGroupContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip="Открыть сайт">
      <a href="https://new.avgst.ru" target="_blank" rel="noopener noreferrer"><ExternalLink /><span>Открыть сайт</span></a>
    </SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
    <SidebarFooter><SidebarMenu><SidebarMenuItem><DropdownMenu><DropdownMenuTrigger asChild>
      <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" aria-label="Меню аккаунта">
        <Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg bg-accent text-accent-foreground">{user.firstName?.slice(0, 1)}{user.lastName?.slice(0, 1)}</AvatarFallback></Avatar>
        <span className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{name}</span><span className="truncate text-xs text-muted-foreground">{user.email}</span></span><MoreVertical className="ml-auto size-4" />
      </SidebarMenuButton>
    </DropdownMenuTrigger><DropdownMenuContent side="top" align="end" className="w-56">
      <DropdownMenuItem asChild><Link href="/account"><Settings />Настройки аккаунта</Link></DropdownMenuItem>
      <DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/logout"><LogOut />Выйти</Link></DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu></SidebarMenuItem></SidebarMenu></SidebarFooter>
  </Sidebar>
}

const sections = [
  { title: 'Обзор', href: '/', lists: ['/'] },
  ...structure.map(item => ({ title: item.title, href: item.href, lists: sectionPaths(item.href) })),
  { title: 'Медиафайлы', href: '/collections/media', lists: ['/collections/media'] },
  { title: 'Пользователи', href: '/collections/users', lists: ['/collections/users'] },
  { title: 'Аккаунт', href: '/account', lists: ['/account'] },
]

function sectionOf(pathname: string) {
  return sections.find(item => item.lists.some(list => list !== '/' && (pathname === list || pathname.startsWith(`${list}/`)))) ?? sections[0]
}

function recordLabel(slug: string, data: Record<string, unknown>) {
  if (slug === 'users') {
    const name = [data.firstName, data.lastName].filter((part): part is string => typeof part === 'string' && Boolean(part.trim())).join(' ')
    return name || (typeof data.email === 'string' ? data.email : 'Пользователь')
  }
  const key = slug === 'projects' ? 'name' : slug === 'media' ? 'filename' : slug === 'project-prices' ? 'lookupKey' : 'title'
  const value = data[key]
  return typeof value === 'string' && value.trim() ? value : 'Запись'
}

function HeaderBreadcrumb() {
  const pathname = usePathname()
  const section = sectionOf(pathname)
  const collection = pathname.match(/^\/collections\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/)
  const doc = collection?.[2] && collection[2] !== 'create' ? { slug: collection[1], id: collection[2] } : null
  const [docLabel, setDocLabel] = useState('')
  useEffect(() => {
    setDocLabel('')
    if (!doc) return
    const controller = new AbortController()
    fetch(`/api/${doc.slug}/${doc.id}?depth=0`, { credentials: 'include', signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => { if (data && typeof data === 'object') setDocLabel(recordLabel(doc.slug, data as Record<string, unknown>)) }).catch(() => {})
    return () => controller.abort()
  }, [doc?.slug, doc?.id])
  const tail: { label: string; href?: string }[] = []
  if (pathname === '/leads') tail.push({ label: 'Заявки' })
  else if (pathname === '/globals/lead-delivery') tail.push({ label: 'Отправка заявок' })
  else if (pathname.startsWith('/collections/lead-submissions')) {
    tail.push({ label: 'Заявки', href: '/leads' })
    if (collection?.[2] === 'create') tail.push({ label: 'Создать' })
    else if (doc && docLabel) tail.push({ label: docLabel, href: collection?.[3] === 'versions' ? `/collections/lead-submissions/${doc.id}` : undefined })
    if (collection?.[3] === 'versions' && docLabel) tail.push({ label: 'Версии' })
  } else if (collection?.[2] === 'create') tail.push({ label: 'Создать' })
  else if (doc && docLabel) {
    tail.push({ label: docLabel, href: collection?.[3] === 'versions' ? `/collections/${doc.slug}/${doc.id}` : undefined })
    if (collection?.[3] === 'versions') tail.push({ label: 'Версии' })
  }
  const crumbs = [{ label: section.title, href: tail.length ? section.href : undefined }, ...tail]
  return <Breadcrumb className="min-w-0">
    <BreadcrumbList>
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1
        return <Fragment key={`${crumb.href ?? ''}:${crumb.label}:${index}`}>
          {index > 0 && <BreadcrumbSeparator />}
          <BreadcrumbItem>{last || !crumb.href ? <BreadcrumbPage>{crumb.label}</BreadcrumbPage> : <BreadcrumbLink asChild><Link href={crumb.href}>{crumb.label}</Link></BreadcrumbLink>}</BreadcrumbItem>
        </Fragment>
      })}
    </BreadcrumbList>
  </Breadcrumb>
}

function SiteHeader() {
  const { theme, setTheme } = useTheme()
  return <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card md:rounded-t-xl">
    <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
    <SidebarTrigger aria-label="Переключить меню" className="-ml-1" /><Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
    <HeaderBreadcrumb />
    <Button className="ml-auto" variant="ghost" size="icon" aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
    </div>
  </header>
}

export function AdminShell({ children, cookieOpen }: { children?: ReactNode; cookieOpen?: boolean }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const { navOpen } = useNav()
  const { setPreference } = usePreferences()
  if (!user || ['/login', '/logout', '/forgot', '/reset', '/create-first-user', '/unauthorized'].some(path => pathname.startsWith(path))) return children
  return <SidebarProvider defaultOpen={cookieOpen ?? navOpen} onOpenChange={open => { void setPreference('nav', { open }, true) }} className="avgst-shell shadcn-surface" style={{ '--sidebar-width': '18rem' } as CSSProperties}>
    <AppSidebar /><SidebarInset><SiteHeader /><div className="min-w-0 flex-1">{children}</div></SidebarInset>
  </SidebarProvider>
}
