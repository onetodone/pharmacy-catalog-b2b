import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ShopLayout } from '@/components/layouts/ShopLayout'
import { AdminLayout } from '@/components/layouts/AdminLayout'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

import { CatalogPage } from '@/pages/shop/CatalogPage'
import { CartPage } from '@/pages/shop/CartPage'
import { CheckoutPage } from '@/pages/shop/CheckoutPage'
import { ShopOrdersPage } from '@/pages/shop/ShopOrdersPage'
import { ShopProfilePage } from '@/pages/shop/ShopProfilePage'
import { NewsPage } from '@/pages/shop/NewsPage'
import { NewsItemPage } from '@/pages/shop/NewsItemPage'

import { DashboardPage } from '@/pages/admin/DashboardPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { ProductFormPage } from '@/pages/admin/ProductFormPage'
import { CategoriesPage } from '@/pages/admin/CategoriesPage'
import { ManufacturersPage } from '@/pages/admin/ManufacturersPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { AdminNewsPage } from '@/pages/admin/AdminNewsPage'
import { AdminProfilePage } from '@/pages/admin/AdminProfilePage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute roles={['CUSTOMER']}>
            <ShopLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CatalogPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders" element={<ShopOrdersPage />} />
        <Route path="profile" element={<ShopProfilePage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="news/:id" element={<NewsItemPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN', 'SUPPLIER']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductFormPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route
          path="categories"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="manufacturers"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <ManufacturersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="news"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminNewsPage />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<AdminProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
