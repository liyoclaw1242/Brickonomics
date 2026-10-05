import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, type Group, type InstancedMesh, type MeshBasicMaterial, NormalBlending, Object3D } from 'three'
import type { Quality } from '../quality'

/** 太陽的外觀（取主題）：圓盤、光暈與光芒的顏色；additive＝光暈用加法混色（暗底上才會發光，亮底上會洗白） */
export type SunLook = { core: string; glow: string; glowOpacity: number; additive: boolean }

/** 每幀由呼叫端填：世界座標、整體亮度 0..1（也是圓盤的不透明度）、光芒亮度 0..1、光芒轉角 */
export type SunFrame = { x: number; y: number; z: number; level: number; rays: number; spin: number }

const RAY_LEN = 1.5
const RAY_W = 0.16
const HALO = 2.6

/** 光暈：中間亮、往外淡掉的圓形漸層（掛載時畫一次） */
function glowTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  if (!g) return null
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

/**
 * 天上的太陽（晴天、熱浪共用）：圓盤＋漸層光暈＋一圈光芒，永遠面向鏡頭。
 * read 每幀把位置、亮度填進同一個物件（不配置）；level 為 0 時藏起來。
 */
export function Sun({ look, radius, rays, quality, read }: { look: SunLook; radius: number; rays: number; quality: Quality; read: (f: SunFrame) => void }) {
  const root = useRef<Group>(null)
  const rayMesh = useRef<InstancedMesh>(null)
  const coreMat = useRef<MeshBasicMaterial>(null)
  const haloMat = useRef<MeshBasicMaterial>(null)
  const rayMat = useRef<MeshBasicMaterial>(null)
  const frame = useMemo<SunFrame>(() => ({ x: 0, y: 0, z: 0, level: 0, rays: 0, spin: 0 }), [])
  const glow = useMemo(glowTexture, [])
  useEffect(() => () => glow?.dispose(), [glow])
  const blending = look.additive ? AdditiveBlending : NormalBlending

  // 光芒的形狀固定：在太陽的平面上放射排列，只在掛載／換畫質時擺一次
  useLayoutEffect(() => {
    const r = rayMesh.current
    if (!r) return
    const dummy = new Object3D()
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2
      const d = radius * 1.35 + RAY_LEN / 2
      dummy.position.set(Math.cos(a) * d, Math.sin(a) * d, 0)
      dummy.rotation.set(0, 0, a - Math.PI / 2)
      dummy.scale.set(RAY_W, RAY_LEN * (i % 2 ? 0.7 : 1), RAY_W)
      dummy.updateMatrix()
      r.setMatrixAt(i, dummy.matrix)
    }
    r.instanceMatrix.needsUpdate = true
  }, [rays, radius])

  useFrame(({ camera }) => {
    const g = root.current
    if (!g) return
    read(frame)
    g.visible = frame.level > 0.01
    g.position.set(frame.x, frame.y, frame.z)
    g.quaternion.copy(camera.quaternion)
    if (rayMesh.current) rayMesh.current.rotation.z = frame.spin
    if (coreMat.current) coreMat.current.opacity = frame.level
    if (haloMat.current) haloMat.current.opacity = look.glowOpacity * frame.level
    if (rayMat.current) rayMat.current.opacity = 0.9 * frame.rays * frame.level
  })

  const seg = quality === 'low' ? 16 : 32
  return (
    <group ref={root} visible={false}>
      <mesh renderOrder={1}>
        <circleGeometry args={[radius, seg]} />
        <meshBasicMaterial ref={coreMat} color={look.core} transparent fog={false} toneMapped={false} />
      </mesh>
      <mesh position-z={-0.05}>
        <planeGeometry args={[radius * HALO * 2, radius * HALO * 2]} />
        <meshBasicMaterial ref={haloMat} map={glow} color={look.glow} transparent blending={blending} depthWrite={false} fog={false} toneMapped={false} />
      </mesh>
      <instancedMesh ref={rayMesh} args={[undefined, undefined, rays]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={rayMat} color={look.glow} transparent blending={blending} depthWrite={false} fog={false} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
