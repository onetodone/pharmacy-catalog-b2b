export type Role = 'ADMIN' | 'SUPPLIER' | 'CUSTOMER'
export type OrderStatus =
  'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'DECLINED'

export interface User {
  id: number
  login: string
  email: string
  name: string
  role: Role
  approved: boolean
  banned: boolean
  avatar: string | null
  phone: string | null
  taxId: string | null
  managerName: string | null
  address: string | null
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: number
  name: string
  createdAt?: string
  _count?: { products: number }
}

export type Manufacturer = Category

export interface Product {
  id: number
  name: string
  code: string
  price: string
  quantity: number
  description: string
  cover: string | null
  archived: boolean
  categoryId: number
  manufacturerId: number
  ownerId: number
  createdAt: string
  updatedAt: string
  category: { id: number; name: string }
  manufacturer: { id: number; name: string }
  owner: { id: number; name: string }
}

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  quantity: number
  price: string
  totalPrice: string
  product: { id: number; name: string; code: string }
}

export interface Order {
  id: number
  code: string
  customerId: number
  supplierId: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  totalPrice: string
  note: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  customer: { id: number; name: string; email: string }
  supplier: { id: number; name: string; email: string }
}

export interface Post {
  id: number
  title: string
  content: string
  authorId: number
  createdAt: string
  updatedAt: string
  author: { id: number; name: string }
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface StatsOverview {
  productCount: number
  lowStock: number
  orderCount: number
  ordersByStatus: Record<OrderStatus, number>
  paidRevenue: number
  recentOrders: Array<
    Pick<
      Order,
      'id' | 'code' | 'status' | 'paymentStatus' | 'totalPrice' | 'createdAt'
    > & {
      customer: { name: string }
      supplier: { name: string }
    }
  >
  latestPosts: Post[]
  usersByRole: Partial<Record<Role, number>>
}
