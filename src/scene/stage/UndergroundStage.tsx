import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { Color } from 'three'
import { universe } from '../../data'
import { T } from '../../ui/strings'
import { CoinPile } from '../CoinPile'
import { labelStyle } from '../labelStyle'
import { BlockMaterial } from '../materials'
import { SECTOR_COLORS } from '../palette'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { coreSegments, goldVein, GROUND_TOP, LAYER_THICKNESS, sectorBreakdown, SECTORS, strataLayout, type Sector } from '../layout/underground'

type Show = 'strata' | 'cores' | 'dig' | 'veins' | 'gold'
const CENTER_Z = 24
const WIDTH = 44
const DEPTH = 30
const FRONT_Z = CENTER_Z + DEPTH / 2
const SOIL = new Color('#5d4037')
const UNCLASSIFIED = '#cfd8dc'
const CORE_HEIGHT = SECTORS.length * LAYER_THICKNESS
const CORE_RADIUS = 1.3
const CORE_Z = FRONT_Z + 2
const LABEL_X = -24
const FADE = 0.35
const VEIN_SECTORS: Sector[] = ['semiconductor', 'finance', 'electronics']
const VEIN_XS = [-12, 0, 12]
const COINS_PER_PILE = 6
const COIN_SCALE = 2.5
const LEDGE_DEPTH = 2.4
const LEDGE_HEIGHT = 0.2

const colorOf = (s: Sector): string => (s === 'unclassified' ? UNCLASSIFIED : SECTOR_COLORS[s] ?? UNCLASSIFIED)
const soilTint = (hex: string): string => `#${new Color(hex).lerp(SOIL, 0.25).getHexString()}`

/** 第 6 關：城市底下的產業地層、岩芯、水平挖、礦脈與黃金礦脈（靜態，不需要連續繪製） */
export function UndergroundStage({ show, cores, quality }: { show: Show; cores?: [string, string]; quality: Quality }) {
  const ready = useAfterFirstTick()
  const layers = useMemo(() => strataLayout().map((l) => ({ ...l, color: soilTint(colorOf(l.sector)) })), [])
  const vein = goldVein()
  const faded = show === 'gold'
  const coreData = useMemo(
    () =>
      (cores ?? []).map((id, i) => ({
        id,
        name: universe.get(id)?.name ?? id,
        x: i === 0 ? -9 : 9,
        segs: coreSegments(sectorBreakdown(universe, id), CORE_HEIGHT),
      })),
    [cores],
  )
  const digLayer = layers[0]!
  const digY = (digLayer.top + digLayer.bottom) / 2
  const veinLayers = layers.filter((l) => VEIN_SECTORS.includes(l.sector))
  return (
    <group>
      {layers.map((l) => (
        <mesh key={l.sector} position={[0, (l.top + l.bottom) / 2, CENTER_Z]}>
          <boxGeometry args={[WIDTH, l.top - l.bottom, DEPTH]} />
          <BlockMaterial kind="matte" quality={quality} color={l.color} opacity={faded ? FADE : 1} />
        </mesh>
      ))}
      <mesh position={[4, (vein.top + vein.bottom) / 2, 36]}>
        <boxGeometry args={[30, vein.top - vein.bottom, 4]} />
        {/* 正面朝向鏡頭時金屬材質反射不到環境光會變黑：這裡用自發光的金色霧面材質 */}
        <meshStandardMaterial color="#ffc107" emissive="#ffa000" emissiveIntensity={0.6} roughness={0.35} metalness={0.3} />
      </mesh>

      {show === 'cores' &&
        coreData.map((c) =>
          c.segs.map((s) => (
            <mesh key={`${c.id}-${s.sector}`} position={[c.x, GROUND_TOP + (s.top + s.bottom) / 2, CORE_Z]}>
              <cylinderGeometry args={[CORE_RADIUS, CORE_RADIUS, s.top - s.bottom, 24]} />
              <BlockMaterial kind="matte" quality={quality} color={colorOf(s.sector)} />
            </mesh>
          )),
        )}

      {show === 'dig' && (
        <mesh position={[0, digY, 40]}>
          <boxGeometry args={[40, 1.2, 2]} />
          <meshBasicMaterial color="#ffd54f" transparent opacity={0.85} />
        </mesh>
      )}

      {show === 'veins' &&
        veinLayers.map((l) =>
          VEIN_XS.map((x) => (
            <group key={`${l.sector}-${x}`}>
              <mesh position={[x, l.bottom + LEDGE_HEIGHT / 2, FRONT_Z + LEDGE_DEPTH / 2]}>
                <boxGeometry args={[5, LEDGE_HEIGHT, LEDGE_DEPTH]} />
                <BlockMaterial kind="matte" quality={quality} color={l.color} />
              </mesh>
              <group position={[x, l.bottom + LEDGE_HEIGHT, FRONT_Z + LEDGE_DEPTH / 2]} scale={COIN_SCALE}>
                <CoinPile count={COINS_PER_PILE} position={[0, 0, 0]} />
              </group>
            </group>
          )),
        )}

      {ready && (
        <>
          {layers.map((l) => (
            <Html key={l.sector} position={[LABEL_X, (l.top + l.bottom) / 2, FRONT_Z + 0.5]} center style={labelStyle}>
              {T.sectors[l.sector]}
            </Html>
          ))}
          <Html position={[-13, (vein.top + vein.bottom) / 2, FRONT_Z + 0.5]} center style={labelStyle}>
            {T.underground.goldVein}
          </Html>
          {show === 'cores' &&
            coreData.map((c) => (
              <Html key={c.id} position={[c.x, GROUND_TOP + 1.2, CORE_Z]} center style={labelStyle}>
                {c.name}
              </Html>
            ))}
          {show === 'dig' && (
            <Html position={[0, digY + 1.4, 41]} center style={labelStyle}>
              {T.underground.dig}
            </Html>
          )}
          {show === 'veins' && (
            <Html position={[0, GROUND_TOP + 1.2, FRONT_Z + 1]} center style={labelStyle}>
              {T.underground.veins}
            </Html>
          )}
        </>
      )}
    </group>
  )
}
