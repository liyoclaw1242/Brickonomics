import type { Course, CourseChapter, CourseId, Step } from './types'
import { COURSE_STEPS, LEVELS } from './levels'
import { T } from '../ui/strings'

/**
 * 課程資料（純資料）：三門獨立的課，每門課＝開頭章＋股票→債券→基金→ETF＋結尾章（口訣卡）；
 * 另有一門實戰課（standalone）：名片→拆開→配息→費用→績效→體檢表。
 * 步驟本身放在步驟池（LEVELS＋COURSE_STEPS），這裡只排 id。規格 §2.1、§2.2（Plan 6 欄）。
 */

/** 步驟池：所有 LEVELS 步驟（照原順序）＋課程專用的新步驟 */
export const STEP_POOL: ReadonlyMap<string, Step> = new Map(
  [...LEVELS.flatMap((l) => l.steps), ...COURSE_STEPS].map((s) => [s.id, s] as const),
)

type Label = { icon: string; name: string }
const [PROLOGUE, STOCK, BOND, FUND, ETF] = T.chapters
const chapter = (id: string, label: Label, stepIds: readonly string[]): CourseChapter => ({ id, icon: label.icon, name: label.name, stepIds })

export const COURSES: readonly Course[] = [
  {
    id: 'beginner',
    name: '初階',
    tagline: '先懂大概',
    available: true,
    chapters: [
      chapter('prologue', PROLOGUE, ['p-1', 'p-2']),
      chapter('stock', STOCK, ['s-1', 's-2', 's-3']),
      chapter('bond', BOND, ['b-1', 'b-3']),
      chapter('fund', FUND, ['f-1', 'f-5', 'f-9']),
      chapter('etf', ETF, ['e-1', 'e-2', 'e-3', 'e-5', 'c-1', 'c-2']),
      chapter('finish', T.courseChapters.finish, ['u-6']),
    ],
  },
  {
    id: 'intermediate',
    name: '中階',
    tagline: '多看一點細節',
    available: true,
    chapters: [
      chapter('review', T.courseChapters.review, ['m-0']),
      chapter('stock', STOCK, ['s-4', 's-dd', 's-5', 's-6', 's-pe']),
      chapter('bond', BOND, ['b-2', 'b-rate', 'b-infl']),
      chapter('fund', FUND, ['f-2', 'f-3', 'f-4', 'f-6', 'f-8']),
      chapter('etf', ETF, ['e-4', 'e-dca', 'c-3', 'u-1', 'u-2', 'u-3', 'u-4', 'u-5']),
      chapter('finish', T.courseChapters.finish, ['m-fin']),
    ],
  },
  {
    // Plan 8：每一步做好就排進來；全部做完才開放（available）
    id: 'advanced',
    name: '高階',
    tagline: '自己組合、算成本',
    available: true,
    chapters: [
      chapter('review', T.courseChapters.review, ['a-0', 'a-port']),
      chapter('stock', STOCK, ['a-corr', 'a-dt']),
      chapter('bond', BOND, ['a-dur']),
      chapter('fund', FUND, ['a-fee30']),
      chapter('etf', ETF, ['a-lev', 'a-hedge', 'a-rebal']),
      chapter('finish', T.courseChapters.finish, ['a-fin']),
    ],
  },
  {
    // Plan 9 實戰課：拆解一檔真基金（體檢資料 data/fundCheckup）。不在初→中→高的順序裡（standalone），初階詞彙
    id: 'practice',
    name: '實戰',
    tagline: '拆解一檔真基金',
    available: true,
    standalone: true,
    chapters: [
      chapter('card', T.practiceChapters.card, ['x-card']),
      chapter('apart', T.practiceChapters.apart, ['x-mix', 'x-where', 'x-hy']),
      chapter('payout', T.practiceChapters.payout, ['x-cc', 'x-pay']),
      chapter('fee', T.practiceChapters.fee, ['x-fee']),
      chapter('perf', T.practiceChapters.perf, ['x-perf']),
      chapter('checkup', T.practiceChapters.checkup, ['x-fin']),
    ],
  },
]

/** 課程裡的步驟（照課程順序）；id 不在步驟池時丟錯（courses.test 保證不會發生） */
export function courseSteps(c: Course): Step[] {
  return c.chapters.flatMap((ch) =>
    ch.stepIds.map((id) => {
      const s = STEP_POOL.get(id)
      if (!s) throw new Error(`unknown step ${id} in course ${c.id}`)
      return s
    }),
  )
}

/** 含這一步的課程（課與課之間不重複，所以最多一門） */
export function courseOfStep(id: string): CourseId | undefined {
  return COURSES.find((c) => c.chapters.some((ch) => ch.stepIds.includes(id)))?.id
}

/** 已開放的課程（開場卡、換階選單用） */
export function availableCourses(): Course[] {
  return COURSES.filter((c) => c.available)
}
