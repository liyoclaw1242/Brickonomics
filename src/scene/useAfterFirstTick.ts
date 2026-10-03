import { useEffect, useState } from 'react'

/**
 * 回傳 false，直到掛載後的第一個 tick 才變 true。
 * 原因：開發模式的 React StrictMode 會「掛載→卸載→重掛」，drei 的 <Html> 與這段同步競爭，
 * 會吃掉第一個 Html。延後一個 tick 再掛載 Html 即可避開（只影響 dev，正式版無此問題）。
 */
export function useAfterFirstTick(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0)
    return () => clearTimeout(t)
  }, [])
  return ready
}
