import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { world } from '../store'

export const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0, ...extra })

// 可复现的随机数，保证每次打开岛的样子都一样
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/* ---------------- 主角：穿睡衣的孩子 ---------------- */

export type Pose = 'idle' | 'walk' | 'fly' | 'sit'

export function Player({ pose }: { pose: () => Pose }) {
  const legL = useRef<THREE.Group>(null!)
  const legR = useRef<THREE.Group>(null!)
  const armL = useRef<THREE.Group>(null!)
  const armR = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const scarf = useRef<THREE.Mesh>(null!)
  const m = useMemo(
    () => ({
      pj: mat('#b9cdea'),
      pjDark: mat('#8fa9d4'),
      skin: mat('#f3cfb1'),
      hair: mat('#4b3427'),
      scarf: mat('#f0b84a', { emissive: '#5a3a00', emissiveIntensity: 0.25 }),
      eye: mat('#2a2230'),
      cheek: mat('#f2a7a0'),
    }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const p = pose()
    const k = 1 - Math.exp(-dt * 10)
    let lL = 0, lR = 0, aLx = 0, aRx = 0, aLz = 0.12, aRz = -0.12, by = 0, bx = 0
    if (p === 'walk') {
      const s = Math.sin(t * 9)
      lL = s * 0.7
      lR = -s * 0.7
      aLx = -s * 0.6
      aRx = s * 0.6
      by = Math.abs(Math.cos(t * 9)) * 0.05
    } else if (p === 'fly') {
      lL = 0.15 + Math.sin(t * 3) * 0.12
      lR = 0.15 - Math.sin(t * 3) * 0.12
      aLz = 1.35 + Math.sin(t * 2) * 0.08
      aRz = -1.35 - Math.sin(t * 2) * 0.08
      bx = 0
    } else if (p === 'sit') {
      lL = -1.45
      lR = -1.45
      aLx = -0.5
      aRx = -0.5
      by = -0.42
    } else {
      by = Math.sin(t * 2) * 0.012
    }
    const lerp = THREE.MathUtils.lerp
    legL.current.rotation.x = lerp(legL.current.rotation.x, lL, k)
    legR.current.rotation.x = lerp(legR.current.rotation.x, lR, k)
    armL.current.rotation.x = lerp(armL.current.rotation.x, aLx, k)
    armR.current.rotation.x = lerp(armR.current.rotation.x, aRx, k)
    armL.current.rotation.z = lerp(armL.current.rotation.z, aLz, k)
    armR.current.rotation.z = lerp(armR.current.rotation.z, aRz, k)
    body.current.position.y = lerp(body.current.position.y, by, k)
    body.current.rotation.x = lerp(body.current.rotation.x, bx, k)
    scarf.current.rotation.x = -0.9 + Math.sin(t * (p === 'fly' ? 14 : 3)) * (p === 'fly' ? 0.25 : 0.08)
  })

  return (
    <group ref={body}>
      {/* 腿 */}
      {[
        [legL, 0.1],
        [legR, -0.1],
      ].map(([ref, x], i) => (
        <group key={i} ref={ref as RefObject<THREE.Group>} position={[x as number, 0.52, 0]}>
          <mesh material={m.pjDark} position={[0, -0.24, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.32, 3, 6]} />
          </mesh>
          <mesh material={m.skin} position={[0, -0.47, 0.03]}>
            <boxGeometry args={[0.12, 0.07, 0.18]} />
          </mesh>
        </group>
      ))}
      {/* 身体 */}
      <mesh material={m.pj} position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.32, 3, 8]} />
      </mesh>
      {[0.68, 0.84].map((y) => (
        <mesh key={y} material={m.pjDark} position={[0, y, 0.205]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[0.03, 0.03, 0.03]} />
        </mesh>
      ))}
      {/* 手臂 */}
      {[
        [armL, 0.29],
        [armR, -0.29],
      ].map(([ref, x], i) => (
        <group key={i} ref={ref as RefObject<THREE.Group>} position={[x as number, 1.0, 0]}>
          <mesh material={m.pj} position={[0, -0.17, 0]}>
            <capsuleGeometry args={[0.07, 0.24, 3, 6]} />
          </mesh>
          <mesh material={m.skin} position={[0, -0.36, 0]}>
            <icosahedronGeometry args={[0.065, 0]} />
          </mesh>
        </group>
      ))}
      {/* 围巾 */}
      <mesh material={m.scarf} position={[0, 1.08, 0]}>
        <cylinderGeometry args={[0.17, 0.2, 0.09, 8]} />
      </mesh>
      <mesh ref={scarf} material={m.scarf} position={[0.08, 1.06, -0.15]}>
        <boxGeometry args={[0.1, 0.03, 0.42]} />
      </mesh>
      {/* 头 */}
      <group position={[0, 1.34, 0]}>
        <mesh material={m.skin} castShadow>
          <icosahedronGeometry args={[0.25, 1]} />
        </mesh>
        <mesh material={m.hair} position={[0, 0.06, -0.03]} rotation={[-0.35, 0, 0]}>
          <sphereGeometry args={[0.265, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        </mesh>
        {[0.085, -0.085].map((x) => (
          <mesh key={x} material={m.eye} position={[x, 0.0, 0.225]}>
            <sphereGeometry args={[0.028, 6, 4]} />
          </mesh>
        ))}
        {[0.14, -0.14].map((x) => (
          <mesh key={x} material={m.cheek} position={[x, -0.07, 0.19]}>
            <sphereGeometry args={[0.035, 6, 4]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ---------------- 植物与石头 ---------------- */

export function RoundTree({ seed = 1, scale = 1 }: { seed?: number; scale?: number }) {
  const parts = useMemo(() => {
    const r = rng(seed)
    const greens = ['#3f7a5a', '#4d8a5f', '#5c9a68', '#356b55']
    const blobs = Array.from({ length: 3 + Math.floor(r() * 2) }, (_, i) => ({
      pos: [(r() - 0.5) * 1.1, 2.1 + i * 0.45 + r() * 0.3, (r() - 0.5) * 1.1] as [number, number, number],
      s: 0.75 + r() * 0.5,
      m: mat(greens[Math.floor(r() * greens.length)]),
    }))
    return { blobs, trunk: mat('#6b4a3a') }
  }, [seed])
  return (
    <group scale={scale}>
      <mesh material={parts.trunk} position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.24, 2.1, 6]} />
      </mesh>
      {parts.blobs.map((b, i) => (
        <mesh key={i} material={b.m} position={b.pos} scale={b.s} castShadow>
          <icosahedronGeometry args={[0.9, 0]} />
        </mesh>
      ))}
    </group>
  )
}

export function PineTree({ seed = 1, scale = 1 }: { seed?: number; scale?: number }) {
  const parts = useMemo(() => {
    const r = rng(seed)
    const c = ['#2f5f55', '#3a6e5e', '#2b5650'][Math.floor(r() * 3)]
    return { leaf: mat(c), trunk: mat('#5e4034'), tilt: (r() - 0.5) * 0.1 }
  }, [seed])
  return (
    <group scale={scale} rotation={[parts.tilt, 0, parts.tilt]}>
      <mesh material={parts.trunk} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.16, 1, 5]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={parts.leaf} position={[0, 1.2 + i * 0.75, 0]} castShadow>
          <coneGeometry args={[1.1 - i * 0.28, 1.4, 7]} />
        </mesh>
      ))}
    </group>
  )
}

export function Rock({ seed = 1, scale = 1 }: { seed?: number; scale?: number }) {
  const m = useMemo(() => mat(['#7d7f91', '#8b8a98', '#6f7184'][seed % 3]), [seed])
  return (
    <mesh material={m} scale={[scale, scale * 0.7, scale]} rotation={[0, seed, 0]} castShadow>
      <dodecahedronGeometry args={[0.6, 0]} />
    </mesh>
  )
}

export function Lantern({ intensity = 1 }: { intensity?: number }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.7, 3]} />
        <meshBasicMaterial color="#3a2a22" />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color="#ffd38a" emissive="#ffb347" emissiveIntensity={2.4 * intensity} flatShading toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------------- 三件童年遗物 ---------------- */

export function PaperPlane() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    // 机头在 +z，两片机翼 + 一条龙骨
    const v = [
      0, 0, 0.6, -0.42, 0.05, -0.4, 0, 0, -0.32,
      0, 0, 0.6, 0, 0, -0.32, 0.42, 0.05, -0.4,
      0, 0, 0.6, 0, -0.13, -0.38, 0, 0, -0.32,
    ]
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} rotation={[0.15, 0.6, 0.1]}>
      <meshStandardMaterial color="#fbf6ec" side={THREE.DoubleSide} flatShading emissive="#fff3d8" emissiveIntensity={0.35} />
    </mesh>
  )
}

export function FireflyJar() {
  const dots = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => {
    dots.current.children.forEach((c, i) => {
      const t = clock.elapsedTime * 0.8 + i * 1.7
      c.position.set(Math.sin(t) * 0.1, 0.22 + Math.sin(t * 1.3) * 0.1, Math.cos(t * 0.9) * 0.1)
    })
  })
  return (
    <group>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.46, 10]} />
        <meshStandardMaterial color="#cfe8ff" transparent opacity={0.28} roughness={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.16, 0.17, 0.07, 10]} />
        <meshStandardMaterial color="#b0784a" flatShading />
      </mesh>
      <group ref={dots}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.025, 6, 4]} />
            <meshBasicMaterial color="#f6ff9a" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function TeddyBear() {
  const m = useMemo(() => ({ fur: mat('#b07a52'), light: mat('#e2bf95'), eye: mat('#24180f'), patch: mat('#8fa9d4') }), [])
  return (
    <group scale={0.9}>
      <mesh material={m.fur} position={[0, 0.25, 0]}>
        <icosahedronGeometry args={[0.24, 1]} />
      </mesh>
      <mesh material={m.light} position={[0, 0.24, 0.17]} scale={[1, 1.1, 0.5]}>
        <icosahedronGeometry args={[0.13, 0]} />
      </mesh>
      <mesh material={m.fur} position={[0, 0.58, 0]}>
        <icosahedronGeometry args={[0.19, 1]} />
      </mesh>
      <mesh material={m.light} position={[0, 0.54, 0.16]}>
        <icosahedronGeometry args={[0.07, 0]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={s > 0 ? m.patch : m.fur} position={[0.14 * s, 0.75, 0]}>
            <icosahedronGeometry args={[0.07, 0]} />
          </mesh>
          <mesh material={m.eye} position={[0.07 * s, 0.62, 0.16]}>
            <sphereGeometry args={[0.022, 5, 4]} />
          </mesh>
          <mesh material={m.fur} position={[0.24 * s, 0.3, 0.05]} rotation={[0, 0, 0.6 * s]}>
            <capsuleGeometry args={[0.06, 0.12, 2, 5]} />
          </mesh>
          <mesh material={m.fur} position={[0.12 * s, 0.06, 0.12]} rotation={[1.4, 0, 0]}>
            <capsuleGeometry args={[0.07, 0.1, 2, 5]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Bench() {
  const wood = useMemo(() => mat('#8a5d42'), [])
  return (
    <group>
      <mesh material={wood} position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.07, 1.8]} />
      </mesh>
      <mesh material={wood} position={[-0.25, 0.8, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.06, 0.5, 1.8]} />
      </mesh>
      {[-0.75, 0.75].map((z) => (
        <mesh key={z} material={wood} position={[0, 0.22, z]}>
          <boxGeometry args={[0.42, 0.44, 0.07]} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------------- 云 ---------------- */

export function makeCloudGeometry(seed: number) {
  const r = rng(seed)
  const parts: THREE.BufferGeometry[] = []
  const n = 5 + Math.floor(r() * 4)
  for (let i = 0; i < n; i++) {
    const g = new THREE.IcosahedronGeometry(1, 1)
    const s = 0.7 + r() * 0.9
    g.scale(s * 1.2, s * 0.75, s)
    g.translate((i - n / 2) * 0.9 + r() * 0.4, r() * 0.5, (r() - 0.5) * 1.4)
    parts.push(g)
  }
  const merged = mergeGeometries(parts)!
  merged.computeVertexNormals()
  return merged
}

export function CloudField({
  count,
  area,
  y,
  spread = 4,
  scale = [3, 8],
  seed = 7,
  avoid = 0,
}: {
  count: number
  area: number
  y: number
  spread?: number
  scale?: [number, number]
  seed?: number
  avoid?: number
}) {
  const geos = useMemo(() => [0, 1, 2].map((i) => makeCloudGeometry(seed * 10 + i)), [seed])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#eef0fa', flatShading: true, roughness: 1, emissive: '#3d4a7a', emissiveIntensity: 0.45 }),
    [],
  )
  const meshes = useMemo(() => {
    const r = rng(seed)
    const per = Math.ceil(count / 3)
    return geos.map((g) => {
      const im = new THREE.InstancedMesh(g, material, per)
      const o = new THREE.Object3D()
      for (let i = 0; i < per; i++) {
        let x = 0, z = 0
        do {
          x = (r() - 0.5) * area
          z = (r() - 0.5) * area
        } while (Math.hypot(x, z) < avoid)
        o.position.set(x, y + (r() - 0.5) * spread, z)
        o.rotation.set(0, r() * Math.PI * 2, 0)
        o.scale.setScalar(scale[0] + r() * (scale[1] - scale[0]))
        o.updateMatrix()
        im.setMatrixAt(i, o.matrix)
      }
      im.frustumCulled = false
      return im
    })
  }, [geos, material, count, area, y, spread, scale, seed, avoid])

  useFrame(() => {
    // 黎明时云层被染成粉金色
    const d = world.dawn
    material.color.setRGB(0.91 + 0.09 * d, 0.92 + 0.0 * d, 0.97 - 0.12 * d)
    material.emissive.setRGB(0.24 + 0.5 * d, 0.29 + 0.25 * d, 0.48 - 0.1 * d)
  })

  return (
    <group>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  )
}
