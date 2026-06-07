import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface HeaderBridgeContextValue {
  createTaskHandler: (() => void) | null
  setCreateTaskHandler: (handler: (() => void) | null) => void
}

const HeaderBridgeContext = createContext<HeaderBridgeContextValue | null>(null)

export function HeaderBridgeProvider({ children }: { children: ReactNode }) {
  const [createTaskHandler, setCreateTaskHandlerState] = useState<(() => void) | null>(null)

  const setCreateTaskHandler = useCallback((handler: (() => void) | null) => {
    setCreateTaskHandlerState(() => handler)
  }, [])

  const value = useMemo(
    () => ({ createTaskHandler, setCreateTaskHandler }),
    [createTaskHandler, setCreateTaskHandler],
  )

  return <HeaderBridgeContext.Provider value={value}>{children}</HeaderBridgeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is co-located with its provider
export function useHeaderBridge() {
  const context = useContext(HeaderBridgeContext)
  if (!context) {
    throw new Error('useHeaderBridge must be used within HeaderBridgeProvider')
  }
  return context
}
