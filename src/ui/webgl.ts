/** 能否建立 WebGL（2 或 1）；建立失敗或拋錯都視為不支援 */
export function hasWebGL(createCanvas: () => { getContext: (id: string) => unknown }): boolean {
  try {
    const c = createCanvas()
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}
