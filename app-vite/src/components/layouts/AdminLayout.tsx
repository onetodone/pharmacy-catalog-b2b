import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Boxes,
  Factory,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Pill,
  ShoppingBag,
  Tags,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/context/auth'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { RoleBadge } from '@/components/badges'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: Role[]
  end?: boolean
}

const NAV: NavItem[] = [
  {
    to: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'SUPPLIER'],
    end: true,
  },
  {
    to: '/admin/products',
    label: 'Products',
    icon: Package,
    roles: ['ADMIN', 'SUPPLIER'],
  },
  {
    to: '/admin/orders',
    label: 'Orders',
    icon: ShoppingBag,
    roles: ['ADMIN', 'SUPPLIER'],
  },
  {
    to: '/admin/categories',
    label: 'Categories',
    icon: Tags,
    roles: ['ADMIN'],
  },
  {
    to: '/admin/manufacturers',
    label: 'Manufacturers',
    icon: Factory,
    roles: ['ADMIN'],
  },
  { to: '/admin/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
  { to: '/admin/news', label: 'News', icon: FileText, roles: ['ADMIN'] },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = NAV.filter((i) => user && i.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background p-4 md:flex">
          <div className="flex items-center gap-2 px-2 py-1 font-semibold">
            <Pill className="h-5 w-5 text-primary" />
            Pharmacy Admin
          </div>
          <nav className="mt-6 flex flex-col gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-2 rounded-md border p-2 text-sm">
            <Boxes className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {user?.role === 'SUPPLIER' ? 'Supplier workspace' : 'Full access'}
            </span>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-6">
            <div className="font-semibold md:hidden">Pharmacy Admin</div>
            <div className="ml-auto flex items-center gap-3">
              {user && <RoleBadge role={user.role} />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Avatar>
                      <AvatarFallback>{user?.name?.[0] ?? 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
