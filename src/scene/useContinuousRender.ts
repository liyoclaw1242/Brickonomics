import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { acquire } from './continuous'

/** frameloop="demand" 下讓持續動畫繼續跑：active 時每幀要求下一幀，並登記為持續繪製（供 FpsGuard 判斷） */
export function useContinuousRender(active = true) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (!active) return
    return acquire()
  }, [active])
  useFrame(() => {
    if (active) invalidate()
  })
}
