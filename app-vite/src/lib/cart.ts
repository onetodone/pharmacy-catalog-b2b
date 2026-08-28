import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartLine {
  productId: number
  name: string
  code: string
  price: number
  cover: string | null
  supplierId: number
  supplierName: string
  maxQuantity: number
  quantity: number
}

interface CartState {
  lines: CartLine[]
  add: (line: Omit<CartLine, 'quantity'>, quantity: number) => void
  setQuantity: (productId: number, quantity: number) => void
  remove: (productId: number) => void
  clear: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line, quantity) =>
        set((state) => {
          const existing = state.lines.find(
            (l) => l.productId === line.productId,
          )
          if (existing) {
            const next = Math.min(
              existing.quantity + quantity,
              line.maxQuantity,
            )
            return {
              lines: state.lines.map((l) =>
                l.productId === line.productId
                  ? { ...l, ...line, quantity: next }
                  : l,
              ),
            }
          }
          return {
            lines: [
              ...state.lines,
              { ...line, quantity: Math.min(quantity, line.maxQuantity) },
            ],
          }
        }),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines: state.lines
            .map((l) =>
              l.productId === productId
                ? {
                    ...l,
                    quantity: Math.max(0, Math.min(quantity, l.maxQuantity)),
                  }
                : l,
            )
            .filter((l) => l.quantity > 0),
        })),
      remove: (productId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.productId !== productId),
        })),
      clear: () => set({ lines: [] }),
      totalItems: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
      totalPrice: () =>
        get().lines.reduce((sum, l) => sum + l.quantity * l.price, 0),
    }),
    { name: 'pharmacy.cart' },
  ),
)
