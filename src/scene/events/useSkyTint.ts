import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Color } from 'three'
import { useThemeStore } from '../../store/theme'
import { THEMES } from '../theme'

/**
 * 天氣事件（晴天、熱浪）把天空與霧的顏色往某個顏色混：回傳 apply(k)，在自己的 useFrame 裡每幀呼叫（k 0..1，0＝主題原色）。
 * 直接改 Lighting 掛上的 scene.background／scene.fog 的顏色（不配置物件）；離開時還原成主題原色並補畫一幀。
 */
export function useSkyTint(skyTo: string, fogTo: string): (k: number) => void {
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)
  const themeId = useThemeStore((s) => s.theme)
  const c = useMemo(() => ({ sky: new Color(), skyTo: new Color(), fog: new Color(), fogTo: new Color() }), [])
  useLayoutEffect(() => {
    const t = THEMES[themeId]
    c.sky.set(t.sky)
    c.fog.set(t.fog.color)
    c.skyTo.set(skyTo)
    c.fogTo.set(fogTo)
  }, [c, themeId, skyTo, fogTo])
  useEffect(
    () => () => {
      if (scene.background instanceof Color) scene.background.copy(c.sky)
      if (scene.fog) scene.fog.color.copy(c.fog)
      invalidate()
    },
    [scene, c, invalidate],
  )
  return useCallback(
    (k: number) => {
      if (scene.background instanceof Color) scene.background.copy(c.sky).lerp(c.skyTo, k)
      if (scene.fog) scene.fog.color.copy(c.fog).lerp(c.fogTo, k)
    },
    [scene, c],
  )
}
