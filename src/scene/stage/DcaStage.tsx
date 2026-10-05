import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { type Group, type InstancedMesh, Object3D } from 'three'
import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { TreeCrown } from '../events/SunnyTree'
import { DCA_DEMO, DCA_LAYOUT, dcaCheapest, dcaNow, dcaPileHeight, dcaPileX, dcaTowerHeight } from '../layout/intermediate'
import { SECTOR_COLORS } from '../palette'
import type { Quality } from '../quality'
import { atPlaza } from './plaza'

const N = DCA_DEMO.prices.length
/** 一檔舉例 ETF 的方塊顏色（鮮明的青綠，和樹冠的綠一起看像一棵樹） */
const look = { color: SECTOR_COLORS.electronics }

/**
 * e-dca 定期定額：每個月一小堆方塊（同樣的錢，便宜的月份買比較多＝比較高），右邊一座塔＝累積的單位。
 * 拖經過月數：小堆一個月一個月出現，塔跟著長高，塔頂的樹冠（events/SunnyTree 的 TreeCrown）跟著月份長出來。
 * 天氣（雲散開、太陽出來）是步驟的 scene.event sunnyTree，鏡頭停下就放晴。
 */
export function DcaStage({ quality }: { quality: Quality }) {
  const months = useTour((s) => s.values.months)
  const now = dcaNow(months)
  const piles = useRef<InstancedMesh>(null)
  const crown = useRef<Group>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [now.months, invalidate])
  const towerH = dcaTowerHeight(now.months)
  const grow = useCallback(() => now.months / N, [now.months])
  const cheap = dcaCheapest()

  useFrame(() => {
    const m = piles.current
    if (m) {
      for (let i = 0; i < N; i++) {
        const on = i < now.months
        const h = dcaPileHeight(i)
        dummy.position.set(...atPlaza(dcaPileX(i), h / 2, DCA_LAYOUT.z))
        dummy.scale.set(on ? DCA_LAYOUT.pileW : 0.001, on ? h : 0.001, on ? DCA_LAYOUT.pileW : 0.001)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
      }
      // 最後一個 instance＝累積的塔
      dummy.position.set(...atPlaza(DCA_LAYOUT.towerX, towerH / 2, DCA_LAYOUT.z))
      dummy.scale.set(DCA_LAYOUT.towerW, towerH, DCA_LAYOUT.towerW)
      dummy.updateMatrix()
      m.setMatrixAt(N, dummy.matrix)
      m.instanceMatrix.needsUpdate = true
    }
    crown.current?.position.set(...atPlaza(DCA_LAYOUT.towerX, towerH - 0.3, DCA_LAYOUT.z))
  })

  return (
    <>
      <instancedMesh ref={piles} args={[undefined, undefined, N + 1]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={look.color} roughness={0.7} />
      </instancedMesh>
      <group ref={crown}>
        <TreeCrown radius={DCA_LAYOUT.crown} grow={grow} quality={quality} />
      </group>
      {now.months > cheap && (
        <Callout
          anchor={atPlaza(dcaPileX(cheap), dcaPileHeight(cheap), DCA_LAYOUT.z)}
          offset={[0, 2.2, 0]}
          title={T.dca.cheap(DCA_DEMO.prices[cheap]!)}
          sub={T.dca.cheapSub}
          color={look.color}
          persistent
        />
      )}
      <Callout
        anchor={atPlaza(DCA_LAYOUT.towerX, 0.1, DCA_LAYOUT.towerW / 2)}
        offset={[0, -0.3, 2.4]}
        title={T.dca.tower(now.months)}
        sub={T.dca.cost(now.result.avgCost.toFixed(1))}
        persistent
      />
    </>
  )
}
