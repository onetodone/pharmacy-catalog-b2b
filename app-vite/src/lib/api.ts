import axios, { AxiosError } from 'axios'

export const TOKEN_KEY = 'pharmacy.token'

/**
 * API base URL. Defaults to the relative `/api` path — same origin as the SPA,
 * which the Vite dev server proxies to the API in development and a reverse
 * proxy is expected to route in production. Set `VITE_API_URL` to point at a
 * different origin (e.g. when the API is deployed on its own host).
 */
const API_URL = import.meta.env.VITE_API_URL ?? '/api'

/** Base URL for uploaded assets. Relative `/uploads` by default (see `API_URL`). */
const ASSETS_URL = import.meta.env.VITE_ASSETS_URL ?? '/uploads'

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      !location.pathname.startsWith('/login')
    ) {
      localStorage.removeItem(TOKEN_KEY)
      location.assign('/login')
    }
    return Promise.reject(error)
  },
)

/** Extract a human-readable message from an axios error. */
export function apiError(
  error: unknown,
  fallback = 'Something went wrong',
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      { message?: string | string[] } | undefined
    if (data?.message)
      return Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message
  }
  return fallback
}

/** Absolute URL for an uploaded asset stored as a relative path. */
export function assetUrl(path: string | null | undefined): string | undefined {
  return path ? `${ASSETS_URL}/${path}` : undefined
}
