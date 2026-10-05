import { useEffect, useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { DirectionalLight, HemisphereLight } from 'three'
import type { Vec3 } from './camera'

/**
 * 事件共用的兩盞燈（一盞天光、一盞平行光）：Lighting 一直掛著（強度 0），事件只改顏色、位置、強度。
 * three.js 的燈數一變，所有受光材質都要重新編譯（Plan 7 review：b-rate 每次過門檻都卡一下），所以事件元件自己不掛燈。
 * 事件用 useEventHemi／useEventKey 取得燈：掛載時設好顏色（與位置），每幀改 intensity；卸載時強度歸 0。
 */
export const eventLights: { hemi: HemisphereLight | null; key: DirectionalLight | null } = { hemi: null, key: null }

/** 事件的天光：sky、ground 顏色；回傳的燈每幀改 intensity（還沒掛好時為 null） */
export function useEventHemi(sky: string, ground: string): () => HemisphereLight | null {
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const h = eventLights.hemi
    if (!h) return
    h.color.set(sky)
    h.groundColor.set(ground)
  }, [sky, ground])
  useEffect(
    () => () => {
      if (eventLights.hemi) eventLights.hemi.intensity = 0
      invalidate()
    },
    [invalidate],
  )
  return () => eventLights.hemi
}

/** 事件的平行光：顏色與位置；回傳的燈每幀改 intensity */
export function useEventKey(color: string, position: Vec3): () => DirectionalLight | null {
  const invalidate = useThree((s) => s.invalidate)
  const [x, y, z] = position
  useLayoutEffect(() => {
    const k = eventLights.key
    if (!k) return
    k.color.set(color)
    k.position.set(x, y, z)
  }, [color, x, y, z])
  useEffect(
    () => () => {
      if (eventLights.key) eventLights.key.intensity = 0
      invalidate()
    },
    [invalidate],
  )
  return () => eventLights.key
}
