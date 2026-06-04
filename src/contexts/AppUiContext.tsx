import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import '../styles/AppUi.css'

type ToastVariant = 'info' | 'success' | 'error'

type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
}

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type PromptOptions = {
  title?: string
  message?: string
  label?: string
  defaultValue?: string
  confirmLabel?: string
}

type AppUiContextValue = {
  toast: (message: string, variant?: ToastVariant) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
}

const AppUiContext = createContext<AppUiContextValue | null>(null)

export function useAppUi(): AppUiContextValue {
  const ctx = useContext(AppUiContext)
  if (!ctx) throw new Error('useAppUi must be used within AppUiProvider')
  return ctx
}

export function AppUiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null)

  const [promptState, setPromptState] = useState<
    (PromptOptions & { resolve: (v: string | null) => void; value: string }) | null
  >(null)

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, message, variant }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve })
    })
  }, [])

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptState({
        ...options,
        value: options.defaultValue ?? '',
        resolve,
      })
    })
  }, [])

  useEffect(() => {
    if (!confirmState && !promptState) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [confirmState, promptState])

  const closeConfirm = (result: boolean) => {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  const closePrompt = (result: string | null) => {
    promptState?.resolve(result)
    setPromptState(null)
  }

  return (
    <AppUiContext.Provider value={{ toast, confirm, prompt }}>
      {children}

      <div className="app-toast-host" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`app-toast ${t.variant}`} role="status">
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="app-dialog-overlay" role="presentation">
          <div className="app-dialog" role="alertdialog" aria-modal="true">
            <h2>{confirmState.title ?? '確認'}</h2>
            <p>{confirmState.message}</p>
            <div className="app-dialog-actions">
              <button
                type="button"
                className="app-dialog-btn secondary"
                onClick={() => closeConfirm(false)}
              >
                {confirmState.cancelLabel ?? 'キャンセル'}
              </button>
              <button
                type="button"
                className={`app-dialog-btn ${confirmState.danger ? 'danger' : 'primary'}`}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptState && (
        <div className="app-dialog-overlay" role="presentation">
          <div className="app-dialog" role="dialog" aria-modal="true">
            <h2>{promptState.title ?? '入力'}</h2>
            {promptState.message && <p>{promptState.message}</p>}
            <label className="app-dialog-label">
              {promptState.label ?? ''}
              <input
                className="app-dialog-input"
                type="text"
                value={promptState.value}
                autoFocus
                onChange={(e) =>
                  setPromptState((s) => (s ? { ...s, value: e.target.value } : s))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') closePrompt(promptState.value.trim() || null)
                }}
              />
            </label>
            <div className="app-dialog-actions">
              <button
                type="button"
                className="app-dialog-btn secondary"
                onClick={() => closePrompt(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="app-dialog-btn primary"
                onClick={() => closePrompt(promptState.value.trim() || null)}
              >
                {promptState.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppUiContext.Provider>
  )
}
