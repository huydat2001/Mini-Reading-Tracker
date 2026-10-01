export type ErrorType =
  | 'timeout'
  | 'network'
  | 'validation'
  | 'bad_request'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'server'
  | 'gateway'
  | 'unknown'

export interface AppErrorDetails {
  type: ErrorType
  title: string
  message: string
  suggestion: string
  statusCode?: number
  code?: string
  rawError?: string
  url?: string
  method?: string
  icon: string
  color: 'error' | 'warning' | 'info' | 'primary'
}

export class AppError extends Error {
  public readonly info: AppErrorDetails

  constructor(info: AppErrorDetails) {
    super(info.message)
    this.name = 'AppError'
    this.info = info
    Object.setPrototypeOf(this, AppError.prototype)
  }

  get title(): string {
    return this.info.title
  }

  get statusCode(): number | undefined {
    return this.info.statusCode
  }

  get suggestion(): string {
    return this.info.suggestion
  }
}

/**
 * Dịch các thông báo lỗi validation tiếng Anh phổ biến từ backend/NestJS sang tiếng Việt
 */
function translateValidationMessage(rawMsg: string): string {
  let text = rawMsg
  const translations: Array<[RegExp, string]> = [
    [/must be a number/gi, 'phải là chữ số'],
    [/must be a string/gi, 'phải là chuỗi ký tự'],
    [/should not be empty/gi, 'không được để trống'],
    [/must be an integer/gi, 'phải là số nguyên'],
    [/must be a boolean/gi, 'phải là giá trị đúng/sai (boolean)'],
    [/must be one of the following values/gi, 'phải thuộc một trong các giá trị hợp lệ'],
    [/is not valid/gi, 'không hợp lệ'],
    [/limit must/gi, 'Số lượng (limit) phải'],
    [/offset must/gi, 'Vị trí bắt đầu (offset) phải'],
    [/page must/gi, 'Số trang (page) phải'],
    [/query should not be empty/gi, 'Từ khóa tìm kiếm không được để trống'],
  ]

  for (const [pattern, replacement] of translations) {
    text = text.replace(pattern, replacement)
  }
  return text
}

/**
 * Phân tích và chuẩn hóa mọi loại lỗi (Axios, Network, Server, Validation,...)
 * thành cấu trúc AppErrorDetails thân thiện với người dùng
 */
export function parseApiError(err: unknown): AppErrorDetails {
  if (err instanceof AppError) {
    return err.info
  }

  const anyErr = err as Record<string, any> | undefined

  const status: number | undefined = anyErr?.response?.status ?? anyErr?.statusCode ?? anyErr?.status
  const code: string | undefined = anyErr?.code
  const method: string | undefined = anyErr?.config?.method?.toUpperCase() ?? anyErr?.request?.method
  const url: string | undefined = anyErr?.config?.url ?? anyErr?.request?.responseURL ?? anyErr?.url

  // Lấy dữ liệu message từ backend response
  const responseData = anyErr?.response?.data
  let backendMessage = ''
  if (responseData) {
    if (typeof responseData.message === 'string') {
      backendMessage = responseData.message
    } else if (Array.isArray(responseData.message)) {
      backendMessage = responseData.message.map((m: any) => translateValidationMessage(String(m))).join('; ')
    } else if (typeof responseData.error === 'string') {
      backendMessage = responseData.error
    }
  }

  const rawError = String(anyErr?.message || anyErr || '')
  const fullRaw = [
    status ? `Status: ${status}` : '',
    code ? `Code: ${code}` : '',
    url ? `URL: ${method || 'GET'} ${url}` : '',
    backendMessage ? `Server response: ${backendMessage}` : '',
    rawError ? `Error: ${rawError}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // 1. Kiểm tra TIMEOUT (15000ms exceeded, ECONNABORTED, ETIMEDOUT)
  const isTimeout =
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    /timeout/i.test(rawError) ||
    /15000ms/i.test(rawError) ||
    status === 504

  if (isTimeout) {
    return {
      type: 'timeout',
      title: 'Hết thời gian chờ phản hồi (Timeout)',
      message:
        'Dịch vụ Open Library hoặc máy chủ mất quá nhiều thời gian để phản hồi (vượt quá 15 giây).',
      suggestion:
        'Dịch vụ Open Library quốc tế đôi khi bị nghẽn tải. Bạn vui lòng kiểm tra kết nối mạng và bấm "Thử lại".',
      statusCode: status || 408,
      code: code || 'ECONNABORTED',
      rawError: fullRaw,
      url,
      method,
      icon: 'mdi-clock-alert-outline',
      color: 'warning',
    }
  }

  // 2. Kiểm tra MẤT KẾT NỐI MẠNG / NETWORK ERROR
  const isNetwork =
    code === 'ERR_NETWORK' ||
    code === 'ERR_CONNECTION_REFUSED' ||
    code === 'ERR_INTERNET_DISCONNECTED' ||
    /network error/i.test(rawError) ||
    /failed to fetch/i.test(rawError) ||
    (typeof navigator !== 'undefined' && !navigator.onLine)

  if (isNetwork) {
    return {
      type: 'network',
      title: 'Không thể kết nối máy chủ',
      message:
        'Không thể thiết lập kết nối tới hệ thống máy chủ.',
      suggestion:
        'Vui lòng kiểm tra lại kết nối Wi-Fi/Internet của thiết bị hoặc đảm bảo máy chủ backend đang được bật.',
      statusCode: status,
      code: code || 'ERR_NETWORK',
      rawError: fullRaw,
      url,
      method,
      icon: 'mdi-wifi-off',
      color: 'error',
    }
  }

  // 3. Phân loại theo HTTP Status Code
  if (status) {
    // 422 - Dữ liệu không hợp lệ (Unprocessable Entity)
    if (status === 422) {
      const detailedMsg = backendMessage
        ? translateValidationMessage(backendMessage)
        : 'Tham số gửi lên không đúng định dạng hoặc hệ thống không thể xử lý dữ liệu này.'
      return {
        type: 'validation',
        title: 'Dữ liệu không hợp lệ (422)',
        message: detailedMsg,
        suggestion:
          'Vui lòng kiểm tra lại từ khóa tìm kiếm, khoảng năm xuất bản hoặc các bộ lọc đang chọn.',
        statusCode: 422,
        code,
        rawError: fullRaw,
        url,
        method,
        icon: 'mdi-file-alert-outline',
        color: 'warning',
      }
    }

    // 400 - Bad Request
    if (status === 400) {
      const detailedMsg = backendMessage
        ? translateValidationMessage(backendMessage)
        : 'Yêu cầu gửi lên không đúng định dạng quy định.'
      return {
        type: 'bad_request',
        title: 'Yêu cầu không hợp lệ (400)',
        message: detailedMsg,
        suggestion:
          'Vui lòng kiểm tra lại các thông số tìm kiếm hoặc làm mới trang.',
        statusCode: 400,
        code,
        rawError: fullRaw,
        url,
        method,
        icon: 'mdi-alert-circle-outline',
        color: 'warning',
      }
    }

    // 404 - Not Found
    if (status === 404) {
      return {
        type: 'not_found',
        title: 'Không tìm thấy dữ liệu (404)',
        message: backendMessage || 'Tác phẩm, chủ đề hoặc thông tin yêu cầu không tồn tại trên hệ thống.',
        suggestion: 'Bạn có thể thử tìm kiếm với từ khóa khác hoặc khám phá các chủ đề phổ biến.',
        statusCode: 404,
        code,
        rawError: fullRaw,
        url,
        method,
        icon: 'mdi-book-search-outline',
        color: 'info',
      }
    }

    // 409 - Conflict (ví dụ sách đã có trong tủ)
    if (status === 409 || /đã có trong tủ|already exists|conflict/i.test(backendMessage || rawError)) {
      return {
        type: 'conflict',
        title: 'Sách đã có trong tủ sách (409)',
        message: backendMessage || 'Cuốn sách này đã tồn tại trong tủ sách cá nhân của bạn.',
        suggestion: 'Bạn có thể chuyển sang mục "Tủ sách cá nhân" để xem hoặc cập nhật tiến độ đọc.',
        statusCode: 409,
        code,
        rawError: fullRaw,
        url,
        method,
        icon: 'mdi-bookmark-check',
        color: 'warning',
      }
    }

    // 429 - Too Many Requests (Rate limit)
    if (status === 429) {
      return {
        type: 'rate_limit',
        title: 'Thao tác quá nhanh (429)',
        message: 'Hệ thống hoặc Open Library phát hiện quá nhiều lượt truy vấn liên tục.',
        suggestion: 'Vui lòng chờ khoảng 3-5 giây trước khi thực hiện thao tác tiếp theo.',
        statusCode: 429,
        code,
        rawError: fullRaw,
        url,
        method,
        icon: 'mdi-timer-sand',
        color: 'warning',
      }
    }

    // 500 - Internal Server Error
    if (status === 500) {
      return {
        type: 'server',
        title: 'Máy chủ đang gặp sự cố (500)',
        message:
          backendMessage ||
          'Máy chủ gặp lỗi bất ngờ trong quá trình truy xuất dữ liệu từ Open Library.',
        suggestion:
          'Sự cố tạm thời phía máy chủ. Bạn vui lòng bấm nút "Thử lại" sau vài giây hoặc tải lại trang.',
        statusCode: 500,
        code,
        rawError: fullRaw,
        url,
        method,
        icon: 'mdi-server-network-off',
        color: 'error',
      }
    }

    // 502, 503 - Gateway / Service Unavailable
    if (status === 502 || status === 503) {
      return {
        type: 'gateway',
        title: `Dịch vụ tạm thời gián đoạn (${status})`,
        message: 'Dịch vụ máy chủ hoặc Open Library đang quá tải hoặc bảo trì định kỳ.',
        suggestion: 'Hệ thống sẽ sớm hoạt động bình thường, vui lòng thử lại sau ít phút.',
        statusCode: status,
        code,
        rawError: fullRaw,
        url,
        method,
        icon: 'mdi-cloud-off-outline',
        color: 'error',
      }
    }
  }

  // 4. Lỗi khác
  const displayMsg = backendMessage || rawError || 'Đã xảy ra sự cố ngoài ý muốn.'
  return {
    type: 'unknown',
    title: 'Đã xảy ra sự cố',
    message: displayMsg,
    suggestion: 'Vui lòng kiểm tra lại thao tác hoặc bấm nút "Thử lại" để tải lại dữ liệu.',
    statusCode: status,
    code,
    rawError: fullRaw,
    url,
    method,
    icon: 'mdi-alert-circle-outline',
    color: 'error',
  }
}
