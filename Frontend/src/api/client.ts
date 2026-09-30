import axios from 'axios'

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
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err.message ||
      'Lỗi không xác định'
    return Promise.reject(new Error(String(msg)))
  },
)

export function unwrap<T>(res: { data: { success: boolean; data: T; message: string } }): T {
  if (!res.data?.success) throw new Error(res.data?.message || 'Yêu cầu thất bại')
  return res.data.data
}

export default api