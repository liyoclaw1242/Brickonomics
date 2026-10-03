/** 能否建立 WebGL（2 或 1）；建立失敗或拋錯都視為不支援 */
export function hasWebGL(createCanvas: () => { getContext: (id: string) => unknown }): boolean {
  try {
    const c = createCanvas()
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    if (!gl) return false
    // 釋放探測用的 context，避免佔用瀏覽器的 context 名額
    ;(gl as { getExtension?: (n: string) => { loseContext?: () => void } | null }).getExtension?.('WEBGL_lose_context')?.loseContext?.()
    return true
  } catch {
    return false
  }
}
