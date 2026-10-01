import axios from 'axios'
import { AppError, parseApiError } from '../utils/errorHandler'

const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
const apiPrefix = import.meta.env.VITE_API_BASE_URL || '/api'

// Kiểm tra trực tiếp biến VITE_ENV do chính bạn tạo trên Vercel
const isProduction = import.meta.env.VITE_ENV === 'production'

// Nếu đúng là Vercel thì nối Full URL, nếu ở máy local thì chỉ dùng /api
const baseURL = isProduction ? `${backendUrl}${apiPrefix}` : apiPrefix

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const errorDetails = parseApiError(err)
    return Promise.reject(new AppError(errorDetails))
  },
)

export function unwrap<T>(res: { data: { success: boolean; data: T; message?: string; error?: string } }): T {
  if (!res.data?.success) {
    const errorDetails = parseApiError({
      response: {
        status: 400,
        data: res.data,
      },
      message: res.data?.message || 'Yêu cầu thất bại',
    })
    throw new AppError(errorDetails)
  }
  return res.data.data
}

export default api