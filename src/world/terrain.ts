import * as THREE from 'three'
import { rng } from './models'

export const ISLAND_R = 14
export const WALK_R = 12.4

// 岛顶的起伏：中间微微隆起，边缘向下收
export function groundHeight(x: number, z: number) {
  const r = Math.hypot(x, z)
  const edge = 1 - THREE.MathUtils.smoothstep(r, ISLAND_R * 0.72, ISLAND_R)
  const hills = 0.55 * Math.sin(x * 0.28 + 0.6) * Math.cos(z * 0.24 - 0.3) + 0.35 * Math.sin((x - z) * 0.17) + 0.6
  return hills * edge - (1 - edge) * 0.6
}

const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
  return s - Math.floor(s)
}

export function makeIslandTop() {
  const n = 34
  const cell = (ISLAND_R * 2) / n
  const g = new THREE.PlaneGeometry(ISLAND_R * 2, ISLAND_R * 2, n, n)
  g.rotateX(-Math.PI / 2)
  const p = g.attributes.position as THREE.BufferAttribute
  const r = rng(3)
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) + (r() - 0.5) * cell * 0.7
    let z = p.getZ(i) + (r() - 0.5) * cell * 0.7
    const d = Math.hypot(x, z)
    if (d > ISLAND_R) {
      x *= ISLAND_R / d
      z *= ISLAND_R / d
    }
    p.setXYZ(i, x, groundHeight(x, z) + (d < ISLAND_R - 0.5 ? (r() - 0.5) * 0.1 : 0), z)
  }
  const flat = g.toNonIndexed()
  const fp = flat.attributes.position as THREE.BufferAttribute
  const greens = ['#5f9a63', '#6aa86b', '#548d5e', '#73b071', '#4f8559', '#679f5f'].map((h) => new THREE.Color(h))
  const edgeTint = new THREE.Color('#8a7a5a')
  const col: number[] = []
  const c = new THREE.Color()
  for (let i = 0; i < fp.count; i += 3) {
    const cx = (fp.getX(i) + fp.getX(i + 1) + fp.getX(i + 2)) / 3
    const cz = (fp.getZ(i) + fp.getZ(i + 1) + fp.getZ(i + 2)) / 3
    c.copy(greens[Math.floor(r() * greens.length)])
    const d = Math.hypot(cx, cz)
    if (d > ISLAND_R - 1.2) c.lerp(edgeTint, 0.4)
    for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b)
  }
  flat.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  flat.deleteAttribute('uv')
  flat.computeVertexNormals()
  return flat
}

export function makeIslandRock(radius = ISLAND_R, depth = 15, seed = 5) {
  const segs = 28
  const g = new THREE.CylinderGeometry(radius * 1.0, 0.6, depth, segs, 7, true)
  g.translate(0, -depth / 2 - 0.55, 0)
  const p = g.attributes.position as THREE.BufferAttribute
  const colors: number[] = []
  const top = new THREE.Color('#6b5444')
  const mid = new THREE.Color('#6d6a80')
  const low = new THREE.Color('#4a4a66')
  const c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const t = -y / depth
    const k = hash(Math.round(Math.atan2(z, x) * 100), Math.round(y * 10), seed)
    const scale = t < 0.05 ? 1 : 0.82 + k * 0.32
    p.setXYZ(i, x * scale, y + (t > 0.05 ? (k - 0.5) * 1.2 : 0), z * scale)
    c.copy(t < 0.12 ? top : t < 0.55 ? mid : low).offsetHSL(0, 0, (k - 0.5) * 0.06)
    colors.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const flat = g.toNonIndexed()
  flat.computeVertexNormals()
  return flat
}
