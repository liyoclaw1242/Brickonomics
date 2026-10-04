import type { ReactNode } from 'react'
import { markPlacement, type Mark } from '../marks'
import { MarkIcon } from '../MarkIcon'
import { T } from '../strings'

/** 品牌＋章節圖示與編號＋大標題；children（一句話）與標題一起放在 aria-live 外層 */
export function StepHeader({ level, levelCount, title, marks, revealed, children }: {
  level: number
  levelCount: number
  title: string
  /** 這一步的標示，每種出現一次：≈ 舉例／✎ 假設的數字在標題旁，？ 資料待更新在一句話後面（r3） */
  marks: readonly Mark[]
  revealed: boolean
  children?: ReactNode
}) {
  const chapter = T.chapters[level]
  const placed = markPlacement(marks)
  return (
    <header className="step-header">
      <p className="brand">{T.brand}</p>
      <p className="step-counter">
        {chapter && (
          <span className="step-counter__icon" role="img" aria-label={chapter.name} title={chapter.name}>
            {chapter.icon}
          </span>
        )}
        {T.chapterCounter(level, levelCount)}
      </p>
      <div className={revealed ? 'step-reveal is-revealed' : 'step-reveal'} aria-live="polite" aria-atomic="true">
        <h1 className="step-title">
          <span className="step-title__text">{title}</span>
          {placed.title.length > 0 && (
            <span className="step-title__marks">
              {placed.title.map((k) => (
                <MarkIcon key={k} kind={k} />
              ))}
            </span>
          )}
        </h1>
        {children}
        {placed.afterLine.length > 0 && (
          <p className="step-marks-after">
            {placed.afterLine.map((k) => (
              <MarkIcon key={k} kind={k} />
            ))}
          </p>
        )}
      </div>
    </header>
  )
}
