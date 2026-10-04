import type { Universe } from '../data/universe'
import { T } from './strings'

const NICK: Readonly<Record<string, string>> = T.nick

/** 3D 標籤上的名稱：產品代號配白話暱稱（0050（台灣50大）），其他用資料裡的名稱 */
export function displayName(u: Universe, id: string): string {
  return NICK[id] ?? u.get(id)?.name ?? id
}
