import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useQuality } from '../store/quality'
import { idleEpoch, isContinuous, shouldSample, type FrameMark } from './continuous'
import { FpsSampler } from './fps'
import { useAfterFirstTick } from './useAfterFirstTick'

const SETTLE_MS = 2000

/** 只觀察幀率，不呼叫 invalidate；只在「上一幀也是持續繪製」時取樣，閒置空檔不計入 */
export function FpsGuard() {
  const mounted = useAfterFirstTick()
  const [settled, setSettled] = useState(false)
  const sampler = useRef(new FpsSampler())
  const prev = useRef<FrameMark>({ continuous: false, epoch: idleEpoch() })
  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [mounted])
  useFrame((_, dt) => {
    const sample = shouldSample(prev.current, idleEpoch())
    prev.current = { continuous: isContinuous(), epoch: idleEpoch() }
    if (!settled) return
    if (!sample) {
      sampler.current.reset()
      return
    }
    if (sampler.current.push(dt)) useQuality.getState().degrade()
  })
  return null
}
