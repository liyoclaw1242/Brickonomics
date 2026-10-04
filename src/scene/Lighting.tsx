import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { useThemeStore } from '../store/theme'
import { QUALITY, type Quality } from './quality'
import { THEMES } from './theme'

export function Lighting({ quality }: { quality: Quality }) {
  const themeId = useThemeStore((s) => s.theme)
  const t = THEMES[themeId]
  const invalidate = useThree((s) => s.invalidate)
  // demand 模式：主題改變要主動要求重繪
  useEffect(() => {
    invalidate()
  }, [themeId, invalidate])
  return (
    <>
      <color attach="background" args={[t.sky]} />
      <fog attach="fog" args={[t.fog.color, t.fog.near, t.fog.far]} />
      <hemisphereLight args={[t.hemi.sky, t.hemi.ground, t.hemi.intensity]} />
      <directionalLight
        color={t.key.color}
        position={t.key.position}
        intensity={t.key.intensity}
        castShadow={QUALITY[quality].shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <directionalLight color={t.fill.color} position={t.fill.position} intensity={t.fill.intensity} />
      <Environment resolution={64} frames={1} environmentIntensity={t.envIntensity}>
        <Lightformer form="rect" intensity={2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[12, 8, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[8, 3, 0]} rotation-y={-Math.PI / 2} scale={[12, 8, 1]} />
      </Environment>
    </>
  )
}
