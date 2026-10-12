'use client'

import { useAuth, useTheme } from '@payloadcms/ui'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconExternalLink as ExternalLink, IconPhoto as Images, IconLayoutDashboard as LayoutDashboard, IconLogout as LogOut, IconDotsVertical as MoreVertical, IconSettings as Settings, IconSun as Sun, IconMoon as Moon, IconUsers as Users } from '@tabler/icons-react'
import type { CSSProperties, ReactNode } from 'react'
import type { User } from '../../payload-types'
import { structure } from '../../config/structure'
import { IconWorld, IconFiles, IconBuildingCommunity, IconBlocks, IconForms, IconSitemap, IconPlugConnected } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Separator } from '../ui/separator'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '../ui/sidebar'

export function EmptyNav() { return null }

const structureIcons = { site: IconWorld, pages: IconFiles, catalog: IconBuildingCommunity, blocks: IconBlocks, forms: IconForms, sections: IconSitemap, integrations: IconPlugConnected }
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
        <SidebarMenuButton asChild isActive={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href) || pathname.startsWith((item.href === '/structure/catalog' ? '/collections/projects' : item.href.replace('/structure/', '/collections/')))} tooltip={item.title}>
          <Link href={item.href} onClick={() => setOpenMobile(false)}><item.icon /><span>{item.title}</span></Link>
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

function SiteHeader() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const title = structure.find(item => pathname === item.href || pathname.startsWith((item.href === '/structure/catalog' ? '/collections/projects' : item.href.replace('/structure/', '/collections/'))))?.title ?? (pathname === '/' ? 'Обзор' : pathname.startsWith('/account') ? 'Аккаунт' : pathname.includes('/media') ? 'Медиафайлы' : pathname.includes('/users') ? 'Пользователи' : 'Панель управления')
  return <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card md:rounded-t-xl">
    <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
    <SidebarTrigger aria-label="Переключить меню" className="-ml-1" /><Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
    <span className="text-base font-medium">{title}</span>
    <Button className="ml-auto" variant="ghost" size="icon" aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
    </div>
  </header>
}

export function AdminShell({ children }: { children?: ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  if (!user || ['/login', '/logout', '/forgot', '/reset', '/create-first-user', '/unauthorized'].some(path => pathname.startsWith(path))) return children
  return <SidebarProvider className="avgst-shell shadcn-surface" style={{ '--sidebar-width': '18rem' } as CSSProperties}>
    <AppSidebar /><SidebarInset><SiteHeader /><div className="min-w-0 flex-1">{children}</div></SidebarInset>
  </SidebarProvider>
}
