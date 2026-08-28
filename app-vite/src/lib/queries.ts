import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Category, Manufacturer } from '@/lib/types'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
  })
}

export function useManufacturers() {
  return useQuery({
    queryKey: ['manufacturers'],
    queryFn: async () => (await api.get<Manufacturer[]>('/manufacturers')).data,
  })
}
