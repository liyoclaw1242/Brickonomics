import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useQuality } from '../store/quality'
import { FpsSampler } from './fps'
import { useAfterFirstTick } from './useAfterFirstTick'

const SETTLE_MS = 2000

/** 只觀察幀率，不呼叫 invalidate；閒置空檔由 FpsSampler 排除 */
export function FpsGuard() {
  const mounted = useAfterFirstTick()
  const [settled, setSettled] = useState(false)
  const sampler = useRef(new FpsSampler())
  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [mounted])
  useFrame((_, dt) => {
    if (!settled) return
    if (sampler.current.push(dt)) useQuality.getState().degrade()
  })
  return null
}
