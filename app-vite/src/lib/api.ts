import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'
const ASSETS_URL = import.meta.env.VITE_ASSETS_URL ?? '/uploads'

let accessToken: string | null = null
export const setAccessToken = (token: string | null) => {
  accessToken = token
}
export const getAccessToken = () => accessToken

export const api = axios.create({ baseURL: API_URL, withCredentials: true })

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

const AUTH_LOGIN = '/auth/login'
const AUTH_REFRESH = '/auth/refresh'

let refreshPromise: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<{ accessToken: string }>(AUTH_REFRESH)
      .then((res) => {
        setAccessToken(res.data.accessToken)
        return res.data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined
    const url = config?.url ?? ''
    const status = error.response?.status

    const isAuthEndpoint =
      url.includes(AUTH_LOGIN) || url.includes(AUTH_REFRESH)

    if (status === 401 && !isAuthEndpoint && config && !config._retry) {
      config._retry = true
      try {
        const token = await refreshAccessToken()
        config.headers.Authorization = `Bearer ${token}`
        return api(config)
      } catch {
        setAccessToken(null)
        if (!location.pathname.startsWith('/login')) location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)

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

export function assetUrl(path: string | null | undefined): string | undefined {
  return path ? `${ASSETS_URL}/${path}` : undefined
}
