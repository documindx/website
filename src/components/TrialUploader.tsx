/**
 * TrialUploader — 官网内嵌试用上传组件（React Island）
 *
 * 状态机：idle → uploading → processing → done | error
 * 支持拖拽上传 + 点击浏览文件
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { translations } from '../i18n/translations'

// ============ 配置 ============

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
const API_BASE = isDev ? 'http://localhost:8000/api' : 'https://app.documindx.com/api'
const APP_BASE = isDev ? 'http://localhost:3001' : 'https://app.documindx.com'

const FILE_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.wps,.et,.dps,.zip'

// ============ 工具函数 ============

function getMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
    wps: 'application/wps-office.wps',
    et: 'application/wps-office.et',
    dps: 'application/wps-office.dps',
    zip: 'application/zip',
  }
  return mimeMap[ext] || 'application/octet-stream'
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new AuthError('认证已过期，请重新上传')
    }
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `请求失败 (${res.status})`)
  }
  return res.json()
}

// ============ 类型 ============

type TrialState = 'idle' | 'hasResult' | 'uploading' | 'processing' | 'done' | 'error'

interface Props {
  lang: 'zh' | 'en'
}

// ============ 组件 ============

export function TrialUploader({ lang }: Props) {
  const t = (key: string) => {
    const k = key as keyof typeof translations.zh
    return translations[lang]?.[k] ?? translations.zh[k] ?? key
  }

  const [state, setState] = useState<TrialState>('idle')
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [documentId, setDocumentId] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartRef = useRef<number>(0)
  const POLL_TIMEOUT = 10 * 60 * 1000 // 10 分钟超时

  // 二次访问检测
  useEffect(() => {
    const existingToken = getCookie('trial_token')
    if (existingToken) {
      fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${existingToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('invalid')
          return res.json()
        })
        .then((user: { is_trial: boolean; trial_expires_at: string | null }) => {
          // 检查试用是否过期
          if (user.is_trial && user.trial_expires_at && new Date(user.trial_expires_at) < new Date()) {
            document.cookie = 'trial_token=; path=/; max-age=0'
            document.cookie = 'trial_token=; path=/; max-age=0; domain=.documindx.com'
            return
          }
          setState('hasResult')
          setToken(existingToken)
        })
        .catch(() => {
          document.cookie = 'trial_token=; path=/; max-age=0'
          document.cookie = 'trial_token=; path=/; max-age=0; domain=.documindx.com'
        })
    }
  }, [])

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const navigateToApp = useCallback((docId?: number | null) => {
    if (!token) return
    const path = docId ? `/documents/${docId}` : '/documents'
    // 统一用 URL 参数传 token，避免跨域 cookie 时序问题
    window.location.href = `${APP_BASE}${path}?trial_token=${token}`
  }, [token])

  // ============ 核心上传逻辑 ============

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setState('uploading')
    setProgress(0)
    setMessage(t('trial.uploading'))
    setError('')

    try {
      // 1. 创建试用账号
      const authRes = await fetch(`${API_BASE}/auth/trial`, { method: 'POST' })
      if (!authRes.ok) {
        const body = await authRes.json().catch(() => ({}))
        throw new Error(body.detail || '创建试用账号失败')
      }
      const auth = await authRes.json()
      const accessToken = auth.access_token
      setToken(accessToken)

      if (isImageFile(file)) {
        // 图片上传
        const presignedRes = await apiFetch<{ items: { image_id: number; presigned_url: string }[] }>(
          '/upload/presigned-urls', accessToken,
          { method: 'POST', body: JSON.stringify({ items: [{ filename: file.name, content_type: file.type, file_size: file.size }] }) },
        )
        await fetch(presignedRes.items[0].presigned_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
        setProgress(50)
        const analyzeRes = await apiFetch<{ task_id: number; document_id: number | null }>('/upload/analyze', accessToken, { method: 'POST', body: JSON.stringify({ image_ids: [presignedRes.items[0].image_id] }) })

        setState('processing')
        setMessage(t('trial.processing'))
        pollStartRef.current = Date.now()

        pollRef.current = setInterval(async () => {
          try {
            if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
              if (pollRef.current) clearInterval(pollRef.current)
              setState('error')
              setError(t('trial.timeout'))
              return
            }
            const task = await apiFetch<{ id: number; status: string; progress: number; document_id: number | null }>(`/tasks/${analyzeRes.task_id}`, accessToken)
            setProgress(50 + Math.round(task.progress / 2))
            if (task.status === 'completed') {
              if (pollRef.current) clearInterval(pollRef.current)
              const docId = task.document_id || analyzeRes.document_id
              const path = docId ? `/documents/${docId}` : '/documents'
              window.location.href = `${APP_BASE}${path}?trial_token=${accessToken}`
            } else if (task.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current)
              setState('error')
              setError(t('trial.error'))
            }
          } catch (err) {
            if (err instanceof AuthError) {
              if (pollRef.current) clearInterval(pollRef.current)
              setState('error')
              setError(err.message)
            }
          }
        }, 3000)
      } else {
        // 文档上传
        const contentType = getMimeType(file)
        const presigned = await apiFetch<{ presigned_url: string; source_file_id: number }>(
          '/files/presigned-url', accessToken,
          { method: 'POST', body: JSON.stringify({ filename: file.name, content_type: contentType, file_size: file.size }) },
        )
        await fetch(presigned.presigned_url, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })
        setProgress(30)
        await apiFetch('/files/confirm', accessToken, { method: 'POST', body: JSON.stringify({ source_file_id: presigned.source_file_id }) })
        setProgress(40)
        const result = await apiFetch<{ task_id: number; document_id: number | null }>(
          '/files/start-process', accessToken,
          { method: 'POST', body: JSON.stringify({ source_file_id: presigned.source_file_id, for_analysis: true }) },
        )
        setProgress(50)

        setState('processing')
        setMessage(t('trial.processing'))
        pollStartRef.current = Date.now()

        pollRef.current = setInterval(async () => {
          try {
            if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
              if (pollRef.current) clearInterval(pollRef.current)
              setState('error')
              setError(t('trial.timeout'))
              return
            }
            const task = await apiFetch<{ status: string; progress: number; document_id: number | null }>(`/tasks/${result.task_id}`, accessToken)
            setProgress(50 + Math.round(task.progress / 2))
            if (task.status === 'completed') {
              if (pollRef.current) clearInterval(pollRef.current)
              const docId = task.document_id || result.document_id
              const path = docId ? `/documents/${docId}` : '/documents'
              window.location.href = `${APP_BASE}${path}?trial_token=${accessToken}`
            } else if (task.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current)
              setState('error')
              setError(t('trial.error'))
            }
          } catch (err) {
            if (err instanceof AuthError) {
              if (pollRef.current) clearInterval(pollRef.current)
              setState('error')
              setError(err.message)
            }
          }
        }, 3000)
      }
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : t('trial.error'))
    }
  }, [t])

  // ============ 事件处理 ============

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleRetry = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setState('idle')
    setError('')
    setFileName('')
    setProgress(0)
    setToken(null)
  }, [])

  // ============ 渲染 ============

  // idle: 紧凑拖拽区
  if (state === 'idle') {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group cursor-pointer rounded-xl border border-dashed px-5 py-4 transition-all duration-200
          ${dragging
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-gray-300 dark:border-gray-600/30 hover:border-indigo-400 dark:hover:border-indigo-400/40 hover:bg-indigo-50 dark:hover:bg-white/[0.03]'
          }`}
      >
        <div className="flex items-center gap-3">
          {/* 图标 */}
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors
            ${dragging ? 'bg-indigo-500/20' : 'bg-gray-100 dark:bg-white/10 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/10'}`}>
            <svg className={`h-4.5 w-4.5 transition-colors ${dragging ? 'text-indigo-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          {/* 文字 */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('trial.dropHint')}
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {t('trial.fileTypes')}
            </p>
          </div>

          {/* 浏览按钮 */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
            className="shrink-0 rounded-lg bg-gray-100 dark:bg-white/10 px-3.5 py-2 text-xs font-medium text-gray-600 dark:text-gray-300
                       ring-1 ring-gray-200 dark:ring-white/10 transition-all hover:bg-gray-200 dark:hover:bg-white/15 hover:ring-gray-300 dark:hover:ring-white/20"
          >
            {t('trial.browseFile')}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={handleFileInput} />
      </div>
    )
  }

  // hasResult: 有上次结果
  if (state === 'hasResult') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3.5">
        <p className="flex-1 text-sm text-emerald-400">{t('trial.hasResult')}</p>
        <button
          onClick={() => navigateToApp()}
          className="shrink-0 rounded-lg bg-emerald-500/20 px-4 py-2 text-xs font-medium text-emerald-300
                     ring-1 ring-emerald-500/30 transition-all hover:bg-emerald-500/30"
        >
          {t('trial.viewPrevResult')} →
        </button>
      </div>
    )
  }

  // uploading / processing / done / error: 进度卡片
  return (
    <div className="rounded-xl bg-white/10 dark:bg-white/5 px-5 py-4 ring-1 ring-white/10 backdrop-blur-xl text-left">
      {/* 文件名 */}
      <div className="flex items-center gap-2 text-sm text-gray-200 dark:text-gray-300 mb-2.5">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="truncate">{fileName}</span>
      </div>

      {/* 进度 */}
      {(state === 'uploading' || state === 'processing') && (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{message}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-indigo-400 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {/* 完成 */}
      {state === 'done' && (
        <>
          <div className="flex items-center gap-2 text-sm text-emerald-400 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{message}</span>
          </div>
          <button onClick={() => navigateToApp(documentId)}
            className="w-full py-2.5 rounded-xl bg-white text-gray-900 font-medium text-sm hover:bg-gray-100 transition-colors">
            {t('trial.viewResult')} →
          </button>
        </>
      )}

      {/* 错误 */}
      {state === 'error' && (
        <>
          <div className="flex items-center gap-2 text-sm text-red-400 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRetry}
              className="flex-1 py-2 rounded-xl border border-white/20 text-sm text-gray-300 hover:bg-white/5 transition-colors">
              {t('trial.retry')}
            </button>
            <button onClick={() => { handleRetry(); setTimeout(() => fileInputRef.current?.click(), 100) }}
              className="flex-1 py-2 rounded-xl border border-white/20 text-sm text-gray-300 hover:bg-white/5 transition-colors">
              {t('trial.reselect')}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={handleFileInput} />
        </>
      )}
    </div>
  )
}

export default TrialUploader
