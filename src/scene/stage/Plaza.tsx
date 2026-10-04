import { useThemeStore } from '../../store/theme'
import { THEMES } from '../theme'
import { PLAZA, PLAZA_SIZE } from './plaza'

export function Plaza() {
  const t = THEMES[useThemeStore((s) => s.theme)]
  return (
    <mesh position={[PLAZA[0], -0.25, PLAZA[2]]} receiveShadow>
      <boxGeometry args={[PLAZA_SIZE[0], 0.5, PLAZA_SIZE[1]]} />
      <meshStandardMaterial color={t.plaza} />
    </mesh>
  )
}
