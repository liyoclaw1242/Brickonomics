import { PLAZA, PLAZA_SIZE } from './plaza'

export function Plaza() {
  return (
    <mesh position={[PLAZA[0], -0.25, PLAZA[2]]} receiveShadow>
      <boxGeometry args={[PLAZA_SIZE[0], 0.5, PLAZA_SIZE[1]]} />
      <meshStandardMaterial color="#f3efe6" />
    </mesh>
  )
}
