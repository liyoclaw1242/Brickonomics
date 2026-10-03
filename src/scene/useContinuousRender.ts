import { useFrame, useThree } from '@react-three/fiber'

/** frameloop="demand" 下讓持續動畫繼續跑：active 時每幀要求下一幀 */
export function useContinuousRender(active = true) {
  const invalidate = useThree((s) => s.invalidate)
  useFrame(() => {
    if (active) invalidate()
  })
}
