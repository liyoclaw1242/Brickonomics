import { Html } from '@react-three/drei'
import { useThemeStore } from '../store/theme'
import type { Vec3 } from './camera'
import { useAfterFirstTick } from './useAfterFirstTick'

export function NameLabel({ position, text, active = false, className }: { position: Vec3; text: string; active?: boolean; className?: string }) {
  const ready = useAfterFirstTick()
  const show = useThemeStore((s) => s.labels)
  if (!ready || !show) return null
  return (
    <Html position={position} center className={`${active ? 'name-label name-label--active' : 'name-label'}${className ? ` ${className}` : ''}`}>
      {text}
    </Html>
  )
}
