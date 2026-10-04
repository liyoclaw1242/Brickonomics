import { useMemo } from 'react'
import { Color } from 'three'
import { universe } from '../../data'
import { useThemeStore } from '../../store/theme'
import { displayName } from '../../ui/names'
import { T } from '../../ui/strings'
import { CoinPile } from '../CoinPile'
import { Callout } from '../Callout'
import { BlockMaterial } from '../materials'
import { ACCENT_COLORS, SECTOR_COLORS } from '../palette'
import type { Quality } from '../quality'
import { THEMES } from '../theme'
import { CORE_R_MIN, coreDiscs, goldVein, GROUND_TOP, sectorBreakdown, strataLayout, STUB_MAX_HEIGHT, unclassifiedStub, type Sector } from '../layout/underground'

type Show = 'strata' | 'cores' | 'dig' | 'veins' | 'gold'
const CENTER_Z = 24
const WIDTH = 44
const DEPTH = 30
const FRONT_Z = CENTER_Z + DEPTH / 2
const ROD_OPACITY = 0.35
const STUB_RADIUS = 1.3
const CORE_Z = FRONT_Z + 2
// 地層名稱貼在地層正面左側（地層寬 44，左緣 −22）：手機窄畫面也不會被左邊界切掉
const LABEL_X = -18
const FADE = 0.35
const VEIN_SECTORS: Sector[] = ['semiconductor', 'finance', 'electronics']
const VEIN_XS = [-12, 0, 12]
const COINS_PER_PILE = 6
const COIN_SCALE = 2.5
const LEDGE_DEPTH = 2.4
const LEDGE_HEIGHT = 0.2

const colorOf = (s: Sector, unclassified: string): string => (s === 'unclassified' ? unclassified : SECTOR_COLORS[s] ?? unclassified)
const soilTint = (hex: string, soil: string): string => `#${new Color(hex).lerp(new Color(soil), 0.25).getHexString()}`

/** 第 6 關：城市底下的產業地層、岩芯、水平挖、礦脈與黃金礦脈（靜態，不需要連續繪製） */
export function UndergroundStage({ show, cores, quality }: { show: Show; cores?: [string, string]; quality: Quality }) {
  const t = THEMES[useThemeStore((s) => s.theme)]
  const UNCLASSIFIED = t.unclassified
  const layers = useMemo(() => strataLayout().map((l) => ({ ...l, color: soilTint(colorOf(l.sector, t.unclassified), t.soil) })), [t.unclassified, t.soil])
  const vein = goldVein()
  const faded = show === 'gold'
  const veinDim = show !== 'gold'
  const coreData = useMemo(
    () =>
      (cores ?? []).map((id, i) => {
        const rows = sectorBreakdown(universe, id)
        return { id, name: displayName(universe, id), x: i === 0 ? -9 : 9, discs: coreDiscs(rows), stub: unclassifiedStub(rows) }
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
                  <meshStandardMaterial color={t.rod} roughness={0.8} metalness={0} transparent opacity={ROD_OPACITY} depthWrite={false} />
                ) : (
                  <BlockMaterial kind="matte" quality={quality} color={colorOf(d.sector, UNCLASSIFIED)} />
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
        // 挖掘帶從地層名稱右邊開始（名稱貼在 x≈−18），不和「半導體」字塊疊在一起
        <mesh position={[2.5, digY, 40]}>
          <boxGeometry args={[35, 1.2, 2]} />
          <meshBasicMaterial color={ACCENT_COLORS.coin} transparent opacity={0.85} />
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

      {/* 地層名稱貼在地層正面：純說明，不畫引線 */}
      {layers.map((l) => (
        <Callout key={l.sector} anchor={[LABEL_X, (l.top + l.bottom) / 2, FRONT_Z + 0.5]} offset={[0, 0, 0]} title={T.sectors[l.sector]} compact />
      ))}
      {/* 黃金礦脈只在介紹地層與黃金時標名；其他步驟它只是背景，少一個字塊 */}
      {(show === 'strata' || show === 'gold') && (
        <Callout anchor={[-17, (vein.top + vein.bottom) / 2, FRONT_Z + 0.5]} offset={[0, 0, 0]} title={T.underground.goldVein} dim={veinDim} compact />
      )}
      {show === 'cores' &&
        coreData.map((c) => (
          <group key={c.id}>
            <Callout anchor={[c.x, GROUND_TOP + c.stub.height, CORE_Z]} offset={[0, STUB_MAX_HEIGHT + 1.6 - c.stub.height, 0]} title={c.name} />
            {c.stub.height > 0 && (
              <Callout anchor={[c.x + STUB_RADIUS, GROUND_TOP + c.stub.height / 2, CORE_Z]} offset={[2.5, 0, 0]} title={T.underground.unclassifiedStub(c.stub.weightPct)} />
            )}
          </group>
        ))}
      {/* 細桿的說明（快照只列前幾大持股）移到面板的「多說一點」：畫面上少一段兩行小字 */}
      {show === 'dig' && <Callout anchor={[0, digY, 40]} offset={[0, 1.4, 1]} title={T.underground.dig} marks={['illustrative']} persistent />}
      {show === 'veins' && <Callout anchor={[0, GROUND_TOP + 1.2, FRONT_Z + 1]} offset={[0, 0, 0]} title={T.underground.veins} marks={['illustrative']} persistent />}
    </group>
  )
}
