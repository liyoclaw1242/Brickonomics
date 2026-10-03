import { useMemo, type CSSProperties } from 'react'
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
import { CORE_R_MIN, coreDiscs, goldVein, GROUND_TOP, sectorBreakdown, strataLayout, STUB_MAX_HEIGHT, unclassifiedStub, type Sector } from '../layout/underground'

type Show = 'strata' | 'cores' | 'dig' | 'veins' | 'gold'
const CENTER_Z = 24
const WIDTH = 44
const DEPTH = 30
const FRONT_Z = CENTER_Z + DEPTH / 2
const SOIL = new Color('#5d4037')
const UNCLASSIFIED = '#cfd8dc'
const ROD = '#78909c'
const ROD_OPACITY = 0.35
const STUB_RADIUS = 1.3
const CORE_Z = FRONT_Z + 2
const LABEL_X = -24
const FADE = 0.35
const VEIN_SECTORS: Sector[] = ['semiconductor', 'finance', 'electronics']
const VEIN_XS = [-12, 0, 12]
const COINS_PER_PILE = 6
const COIN_SCALE = 2.5
const LEDGE_DEPTH = 2.4
const LEDGE_HEIGHT = 0.2

const dimLabelStyle: CSSProperties = { ...labelStyle, opacity: FADE }
const colorOf = (s: Sector): string => (s === 'unclassified' ? UNCLASSIFIED : SECTOR_COLORS[s] ?? UNCLASSIFIED)
const soilTint = (hex: string): string => `#${new Color(hex).lerp(SOIL, 0.25).getHexString()}`

/** 第 6 關：城市底下的產業地層、岩芯、水平挖、礦脈與黃金礦脈（靜態，不需要連續繪製） */
export function UndergroundStage({ show, cores, quality }: { show: Show; cores?: [string, string]; quality: Quality }) {
  const ready = useAfterFirstTick()
  const layers = useMemo(() => strataLayout().map((l) => ({ ...l, color: soilTint(colorOf(l.sector)) })), [])
  const vein = goldVein()
  const faded = show === 'gold'
  const veinDim = show !== 'gold'
  const coreData = useMemo(
    () =>
      (cores ?? []).map((id, i) => {
        const rows = sectorBreakdown(universe, id)
        return { id, name: universe.get(id)?.name ?? id, x: i === 0 ? -9 : 9, discs: coreDiscs(rows), stub: unclassifiedStub(rows) }
      }),
    [cores],
  )
  const digLayer = layers.find((l) => l.sector === 'semiconductor') ?? layers[0]!
  const digY = (digLayer.top + digLayer.bottom) / 2
  const veinLayers = layers.filter((l) => VEIN_SECTORS.includes(l.sector))
  return (
    <group>
      {layers.map((l) => (
        <mesh key={l.sector} position={[0, (l.top + l.bottom) / 2, CENTER_Z]}>
          <boxGeometry args={[WIDTH, l.top - l.bottom, DEPTH]} />
          {/* 半透明時不寫深度，避免層與層、層與礦脈之間的排序破面 */}
          <meshStandardMaterial color={l.color} roughness={0.8} metalness={0} transparent={faded} opacity={faded ? FADE : 1} depthWrite={!faded} />
        </mesh>
      ))}
      <mesh position={[4, (vein.top + vein.bottom) / 2, 36]}>
        <boxGeometry args={[30, vein.top - vein.bottom, 4]} />
        {/* 正面朝向鏡頭時金屬材質反射不到環境光會變黑：這裡用自發光的金色霧面材質 */}
        <meshStandardMaterial color="#ffc107" emissive="#ffa000" emissiveIntensity={0.6} roughness={0.35} metalness={0.3} transparent={veinDim} opacity={veinDim ? FADE : 1} />
      </mesh>

      {show === 'cores' &&
        coreData.map((c) =>
          <group key={c.id}>
            {c.discs.map((d) => (
              <mesh key={d.sector} position={[c.x, (d.top + d.bottom) / 2, CORE_Z]}>
                <cylinderGeometry args={[d.radius, d.radius, d.top - d.bottom, 32]} />
                {/* 該產業 0%：細桿用中性深色，避免被讀成「有一點點」 */}
                {d.radius <= CORE_R_MIN ? (
                  <meshStandardMaterial color={ROD} roughness={0.8} metalness={0} transparent opacity={ROD_OPACITY} depthWrite={false} />
                ) : (
                  <BlockMaterial kind="matte" quality={quality} color={colorOf(d.sector)} />
                )}
              </mesh>
            ))}
            {c.stub.height > 0 && (
              <mesh position={[c.x, GROUND_TOP + c.stub.height / 2, CORE_Z]}>
                <cylinderGeometry args={[STUB_RADIUS, STUB_RADIUS, c.stub.height, 32]} />
                <BlockMaterial kind="matte" quality={quality} color={UNCLASSIFIED} />
              </mesh>
            )}
          </group>
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
          <Html position={[-17, (vein.top + vein.bottom) / 2, FRONT_Z + 0.5]} center style={veinDim ? dimLabelStyle : labelStyle}>
            {T.underground.goldVein}
          </Html>
          {show === 'cores' &&
            coreData.map((c) => (
              <group key={c.id}>
                <Html position={[c.x, GROUND_TOP + STUB_MAX_HEIGHT + 1.6, CORE_Z]} center style={labelStyle}>
                  {c.name}
                </Html>
                {c.stub.height > 0 && (
                  <Html position={[c.x, GROUND_TOP + c.stub.height + 0.9, CORE_Z]} center style={labelStyle}>
                    {T.underground.unclassifiedStub(c.stub.weightPct)}
                  </Html>
                )}
              </group>
            ))}
          {show === 'cores' && (
            <Html position={[0, GROUND_TOP - 17, CORE_Z]} center style={labelStyle}>
              {T.underground.rodLegend}
            </Html>
          )}
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
