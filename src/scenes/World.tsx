import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, world, SUN_DIR, MOON_DIR } from '../store'
import { ITEMS, LINES, type ItemId } from '../content'
import { audio } from '../audio'
import {
  Player, RoundTree, PineTree, Rock, Lantern, PaperPlane, FireflyJar, TeddyBear, Bench, CloudField, mat, rng, type Pose,
} from '../world/models'
import { GlowStar, LightPillar, Fireflies } from '../world/fx'
import { groundHeight, makeIslandTop, makeIslandRock, WALK_R } from '../world/terrain'

const V = THREE.Vector3
const BENCH = new V(11.2, groundHeight(11.2, 0), 0)
const START = new V(-8, groundHeight(-8, 2), 2)

const FLIGHT_TIME = 30
const curve = new THREE.CatmullRomCurve3(
  [
    new V(-175, 16, 80),
    new V(-140, 22, 62),
    new V(-105, 15, 58),
    new V(-75, 21, 30),
    new V(-48, 15, 18),
    new V(-26, 8, 8),
    new V(-14, 3.2, 3.5),
    new V(START.x, START.y + 0.05, START.z),
  ],
  false,
  'centripetal',
)
const RING_US = [0.1, 0.17, 0.24, 0.31, 0.38, 0.45, 0.52, 0.59, 0.66, 0.73, 0.8]

function frameAt(u: number) {
  const p = curve.getPointAt(u)
  const t = curve.getTangentAt(u)
  const r = new V().crossVectors(t, new V(0, 1, 0)).normalize()
  const up = new V().crossVectors(r, t).normalize()
  return { p, t, r, up }
}

/* ---------------- 灯光与雾：随黎明变化 ---------------- */

function LightRig() {
  const key = useRef<THREE.DirectionalLight>(null!)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const { scene } = useThree()
  const c = useMemo(
    () => ({
      moon: new THREE.Color('#a9bcff'),
      sun: new THREE.Color('#ffc890'),
      fogN: new THREE.Color('#1d2752'),
      fogD: new THREE.Color('#e7b29c'),
      skyN: new THREE.Color('#5868a8'),
      skyD: new THREE.Color('#ffd7b8'),
      gN: new THREE.Color('#1b1d33'),
      gD: new THREE.Color('#6b5a6a'),
      dir: new V(),
    }),
    [],
  )
  useEffect(() => {
    scene.fog = new THREE.Fog('#1d2752', 40, 260)
    return () => {
      scene.fog = null
    }
  }, [scene])
  useFrame(() => {
    const d = world.dawn
    const s = THREE.MathUtils.smoothstep(d, 0.25, 0.75)
    c.dir.copy(MOON_DIR).lerp(SUN_DIR, s).normalize()
    key.current.position.copy(world.player).addScaledVector(c.dir, 30)
    key.current.target.position.copy(world.player)
    key.current.target.updateMatrixWorld()
    key.current.color.copy(c.moon).lerp(c.sun, d)
    key.current.intensity = 1.3 + d * 1.6
    hemi.current.color.copy(c.skyN).lerp(c.skyD, d)
    hemi.current.groundColor.copy(c.gN).lerp(c.gD, d)
    hemi.current.intensity = 0.9 + d * 0.6
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(c.fogN).lerp(c.fogD, d)
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#5868a8', '#1b1d33', 0.9]} />
      <directionalLight
        ref={key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0008}
      />
    </>
  )
}

/* ---------------- 岛 ---------------- */

const TREES: [number, number, 'pine' | 'round', number][] = [
  [-10.2, -3.2, 'pine', 1.1], [-9, -7, 'round', 1], [-6, -9.6, 'pine', 1.2], [-1.2, -10.6, 'pine', 1],
  [3, -10, 'round', 1.1], [8, -8, 'pine', 1.15], [9.8, -4.2, 'round', 0.9], [1.2, -6.8, 'round', 0.85],
  [-10.4, 6.2, 'pine', 1], [-3.4, 9.6, 'round', 1.1], [1.8, 10.4, 'pine', 1.2], [6.2, 8.4, 'round', 1],
  [5.2, 11.4, 'pine', 0.9], [-7.4, 9.2, 'pine', 0.8], [4.6, 3.6, 'round', 0.75], [-11.6, 1.2, 'pine', 0.75],
]
const ROCKS: [number, number, number][] = [[-5, 1, 0.8], [7.5, -1.8, 0.6], [2.5, -3, 0.5], [-8.8, -1.2, 0.5], [12.2, 3.2, 0.7], [12.4, -3, 0.6], [0, 7.4, 0.55]]

function Flowers() {
  const mesh = useMemo(() => {
    const r = rng(11)
    const g = new THREE.IcosahedronGeometry(0.045, 0)
    const m = new THREE.MeshStandardMaterial({ flatShading: true })
    const n = 140
    const im = new THREE.InstancedMesh(g, m, n)
    const o = new THREE.Object3D()
    const cols = ['#ffe9f0', '#ff9fb8', '#ffd35a', '#a9c4ff'].map((c) => new THREE.Color(c))
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2
      const rad = Math.sqrt(r()) * 12.5
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad
      o.position.set(x, groundHeight(x, z) + 0.06, z)
      o.scale.setScalar(0.6 + r() * 0.8)
      o.updateMatrix()
      im.setMatrixAt(i, o.matrix)
      im.setColorAt(i, cols[Math.floor(r() * cols.length)])
    }
    return im
  }, [])
  return <primitive object={mesh} />
}

function Island({ onGround }: { onGround: (p: THREE.Vector3) => void }) {
  const top = useMemo(() => makeIslandTop(), [])
  const rock = useMemo(() => makeIslandRock(), [])
  const vc = useMemo(() => mat('#ffffff', { vertexColors: true }), [])
  return (
    <group>
      <mesh
        geometry={top}
        material={vc}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          onGround(e.point.clone())
        }}
      />
      <mesh geometry={rock} material={vc} />
      {TREES.map(([x, z, kind, s], i) => (
        <group key={i} position={[x, groundHeight(x, z) - 0.05, z]} rotation={[0, i * 1.3, 0]}>
          {kind === 'pine' ? <PineTree seed={i + 3} scale={s} /> : <RoundTree seed={i + 3} scale={s} />}
        </group>
      ))}
      {ROCKS.map(([x, z, s], i) => (
        <group key={i} position={[x, groundHeight(x, z), z]}>
          <Rock seed={i} scale={s} />
        </group>
      ))}
      {/* 挂着灯笼的老树 */}
      <group position={[-4.8, groundHeight(-4.8, -5.6) - 0.1, -5.6]}>
        <RoundTree seed={42} scale={1.9} />
        {[
          [1.2, 2.6, 0.6], [-0.9, 2.9, 1.1], [0.4, 2.4, -1.3], [1.6, 3.4, -0.4], [-1.5, 3.2, -0.5],
        ].map((p, i) => (
          <group key={i} position={p as [number, number, number]}>
            <Lantern />
          </group>
        ))}
        <pointLight position={[0.5, 3, 0.5]} color="#ffb35c" intensity={14} distance={10} decay={1.6} />
      </group>
      <group position={[BENCH.x, BENCH.y, BENCH.z]}>
        <Bench />
      </group>
      <Flowers />
      <Fireflies ground={groundHeight} />
      {/* 岛底垂下的藤蔓与发光的小石头 */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3
        return (
          <mesh key={i} position={[Math.cos(a) * 9, -6 - (i % 3) * 2, Math.sin(a) * 9]}>
            <octahedronGeometry args={[0.25, 0]} />
            <meshStandardMaterial color="#9fd7ff" emissive="#6fb8ff" emissiveIntensity={1.4} flatShading toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}

function DistantIslands() {
  const top = useMemo(() => makeIslandTop(), [])
  const rock = useMemo(() => makeIslandRock(14, 18, 9), [])
  const vc = useMemo(() => mat('#ffffff', { vertexColors: true }), [])
  const list: [number, number, number, number][] = [
    [55, 8, -60, 0.28], [-60, -4, -70, 0.35], [75, -10, 30, 0.22], [-30, 14, -110, 0.3], [20, -8, 75, 0.2], [-95, 4, 10, 0.25],
  ]
  const refs = useRef<THREE.Group[]>([])
  useFrame(({ clock }) => {
    refs.current.forEach((g, i) => g && (g.position.y = list[i][1] + Math.sin(clock.elapsedTime * 0.3 + i) * 0.8))
  })
  return (
    <>
      {list.map(([x, y, z, s], i) => (
        <group key={i} ref={(g) => { if (g) refs.current[i] = g }} position={[x, y, z]} scale={s}>
          <mesh geometry={top} material={vc} />
          <mesh geometry={rock} material={vc} />
          <group position={[2, 0.5, -1]} scale={1.6}>
            {i % 2 ? <PineTree seed={i} scale={2} /> : <RoundTree seed={i} scale={2} />}
          </group>
        </group>
      ))}
    </>
  )
}

function FlightHouse() {
  // 起飞的那扇窗：一座小房子浮在云上
  const { p, t } = useMemo(() => frameAt(0), [])
  const pos = p.clone().addScaledVector(t, -16).add(new V(0, -5, 0))
  return (
    <group position={pos} rotation={[0, Math.atan2(t.x, t.z), 0]}>
      <mesh material={mat('#d9cbb8')} position={[0, 1.5, 0]}>
        <boxGeometry args={[4, 3, 3.4]} />
      </mesh>
      <mesh material={mat('#7a4b4b')} position={[0, 3.6, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.3, 1.8, 4]} />
      </mesh>
      <mesh position={[0, 1.8, 1.72]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshBasicMaterial color="#ffcf7a" toneMapped={false} />
      </mesh>
      <CloudField count={6} area={10} y={-1} spread={1} scale={[2, 3]} seed={4} />
    </group>
  )
}

/* ---------------- 星环 ---------------- */

function Rings({ playerRef }: { playerRef: RefObject<THREE.Group | null> }) {
  const rings = useMemo(() => {
    const r = rng(21)
    return RING_US.map((u) => {
      const f = frameAt(u)
      const c = f.p.clone().addScaledVector(f.r, (r() - 0.5) * 9).addScaledVector(f.up, (r() - 0.5) * 4.5)
      const q = new THREE.Quaternion().setFromUnitVectors(new V(0, 0, 1), f.t)
      return { c, q, hit: false, burst: 0 }
    })
  }, [])
  const refs = useRef<THREE.Group[]>([])
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd98a', toneMapped: false, transparent: true }), [])
  useFrame((_, dt) => {
    const p = playerRef.current?.position
    if (!p) return
    rings.forEach((ring, i) => {
      const g = refs.current[i]
      if (!g) return
      g.rotateZ(dt * 0.6)
      if (!ring.hit && p.distanceTo(ring.c) < 2.1) {
        ring.hit = true
        audio.chime()
      }
      if (ring.hit) {
        ring.burst = Math.min(ring.burst + dt * 1.6, 1)
        g.scale.setScalar(1 + ring.burst * 1.8)
        ;(g.children[0] as THREE.Mesh).visible = ring.burst < 1
        g.visible = ring.burst < 1
      }
    })
  })
  return (
    <>
      {rings.map((ring, i) => (
        <group key={i} ref={(g) => { if (g) refs.current[i] = g }} position={ring.c} quaternion={ring.q}>
          <mesh material={m}>
            <torusGeometry args={[1.5, 0.06, 6, 32]} />
          </mesh>
          <GlowStar size={1.3} pulse={0} />
        </group>
      ))}
    </>
  )
}

/* ---------------- 遗物 ---------------- */

function MemoryBeacon({ id, onPick }: { id: ItemId; onPick: (p: THREE.Vector3) => void }) {
  const item = ITEMS.find((i) => i.id === id)!
  const found = useStore((s) => Boolean(s.answers[id]))
  const g = useRef<THREE.Group>(null!)
  const pos = useMemo(() => new V(item.pos[0], groundHeight(item.pos[0], item.pos[1]), item.pos[1]), [item])
  const [gone, setGone] = useState(false)
  const shrink = useRef(1)
  useFrame(({ clock }, dt) => {
    if (!g.current) return
    g.current.position.y = 0.7 + Math.sin(clock.elapsedTime * 1.6) * 0.12
    g.current.rotation.y += dt * 0.7
    if (found && !gone) {
      shrink.current = Math.max(0, shrink.current - dt * 1.5)
      g.current.scale.setScalar(shrink.current)
      if (shrink.current === 0) setGone(true)
    }
  })
  if (gone) return null
  return (
    <group position={pos}>
      <group
        ref={g}
        onClick={(e) => {
          e.stopPropagation()
          onPick(pos)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        {id === 'plane' && <PaperPlane />}
        {id === 'jar' && <FireflyJar />}
        {id === 'bear' && <TeddyBear />}
        <mesh visible={false}>
          <sphereGeometry args={[0.8, 8, 6]} />
        </mesh>
      </group>
      {!found && (
        <>
          <LightPillar />
          <Sparkles count={24} scale={[1.6, 2.4, 1.6]} position={[0, 1, 0]} size={3} speed={0.4} color="#ffe7a8" />
          <pointLight position={[0, 1, 0]} color="#ffd68a" intensity={3} distance={4} decay={1.5} />
        </>
      )}
    </group>
  )
}

/* ---------------- 主场景 ---------------- */

export default function World() {
  const stage = useStore((s) => s.stage)
  const answers = useStore((s) => s.answers)
  const say = useStore((s) => s.say)
  const playerRef = useRef<THREE.Group>(null)
  const pose = useRef<Pose>('fly')
  const flightT = useRef(0)
  const sunriseT = useRef(0)
  const cues = useRef(new Set<string>())
  const steer = useRef(new THREE.Vector2())
  const camLook = useRef(new V())
  const { camera } = useThree()
  const found = Object.keys(answers).length
  const allFound = found === ITEMS.length

  // 进入飞行：把相机放到起点后面
  useEffect(() => {
    if (stage === 'flight') {
      flightT.current = 0
      cues.current.clear()
      world.dawn = 0
      const f = frameAt(0)
      camera.position.copy(f.p).addScaledVector(f.t, -6).addScaledVector(f.up, 1.6)
      camLook.current.copy(f.p)
      audio.setMood('flight')
      window.setTimeout(() => say(LINES.flightStart, 4500), 900)
    }
    if (stage === 'island') {
      audio.setMood('island')
    }
    if (stage === 'sunrise') {
      sunriseT.current = 0
      audio.setMood('sunrise')
    }
  }, [stage, camera, say])

  // 找到遗物后的旁白
  useEffect(() => {
    if (stage !== 'island' || found === 0) return
    const t = window.setTimeout(() => {
      if (found < ITEMS.length) say(LINES.islandProgress[found - 1])
      else say(LINES.islandDone, 6000)
    }, 600)
    return () => window.clearTimeout(t)
  }, [found, stage, say])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const pl = playerRef.current
    if (!pl) return
    const k = 1 - Math.exp(-dt * 3.5)

    if (stage === 'flight') {
      flightT.current += dt
      const x = Math.min(flightT.current / FLIGHT_TIME, 1)
      const u = x * 0.9 + THREE.MathUtils.smootherstep(x, 0, 1) * 0.1
      const f = frameAt(Math.min(u, 0.9999))
      // 鼠标 / 触摸 / 键盘控制偏移
      let sx = world.pointer.x, sy = world.pointer.y
      if (world.keys.has('ArrowLeft') || world.keys.has('a')) sx = -1
      if (world.keys.has('ArrowRight') || world.keys.has('d')) sx = 1
      if (world.keys.has('ArrowUp') || world.keys.has('w')) sy = 1
      if (world.keys.has('ArrowDown') || world.keys.has('s')) sy = -1
      const settle = 1 - THREE.MathUtils.smoothstep(u, 0.82, 0.95)
      const prevX = steer.current.x
      steer.current.x += (sx * 6 * settle - steer.current.x) * (1 - Math.exp(-dt * 2.2))
      steer.current.y += (sy * 3.2 * settle - steer.current.y) * (1 - Math.exp(-dt * 2.2))
      pl.position.copy(f.p).addScaledVector(f.r, steer.current.x).addScaledVector(f.up, steer.current.y)
      const ahead = pl.position.clone().add(f.t)
      pl.lookAt(ahead)
      const bank = THREE.MathUtils.clamp((steer.current.x - prevX) / Math.max(dt, 1e-3) * -0.12, -0.6, 0.6)
      pl.rotateZ(bank)
      pl.rotateX(1.15 * settle + 0.1)
      pose.current = settle > 0.2 ? 'fly' : 'idle'
      world.player.copy(pl.position)
      audio.setWind(settle)

      const camTarget = pl.position.clone().addScaledVector(f.t, -5.5 - 1.5 * (1 - settle)).addScaledVector(f.up, 1.5 + 2 * (1 - settle))
      camera.position.lerp(camTarget, k)
      camLook.current.lerp(pl.position.clone().addScaledVector(f.t, 3 * settle), k)
      camera.lookAt(camLook.current)

      if (x > 0.42 && !cues.current.has('mid')) {
        cues.current.add('mid')
        say(LINES.flightMid, 4500)
      }
      if (x > 0.76 && !cues.current.has('end')) {
        cues.current.add('end')
        say(LINES.flightEnd, 3500)
      }
      if (x >= 1) {
        pl.rotation.set(0, Math.PI / 2, 0)
        world.player.copy(START)
        useStore.getState().setStage('island')
        window.setTimeout(() => say(LINES.islandArrive, 5500), 400)
      }
      return
    }

    if (stage === 'island') {
      const st = useStore.getState()
      const dir = new V()
      if (!st.activeItem) {
        if (world.keys.has('ArrowUp') || world.keys.has('w')) dir.z -= 1
        if (world.keys.has('ArrowDown') || world.keys.has('s')) dir.z += 1
        if (world.keys.has('ArrowLeft') || world.keys.has('a')) dir.x -= 1
        if (world.keys.has('ArrowRight') || world.keys.has('d')) dir.x += 1
        if (dir.lengthSq() > 0) world.target = null
        else if (world.target) {
          dir.set(world.target.x - world.player.x, 0, world.target.z - world.player.z)
          if (dir.length() < 0.15) {
            world.target = null
            dir.set(0, 0, 0)
          }
        }
      }
      const moving = dir.lengthSq() > 0
      if (moving) {
        dir.normalize()
        world.player.addScaledVector(dir, 3.6 * dt)
        const r = Math.hypot(world.player.x, world.player.z)
        if (r > WALK_R) world.player.multiplyScalar(WALK_R / r)
        const yaw = Math.atan2(dir.x, dir.z)
        const cur = pl.rotation.y
        const diff = Math.atan2(Math.sin(yaw - cur), Math.cos(yaw - cur))
        pl.rotation.set(0, cur + diff * (1 - Math.exp(-dt * 10)), 0)
      }
      world.player.y = groundHeight(world.player.x, world.player.z)
      pl.position.lerp(world.player, 1 - Math.exp(-dt * 20))
      pl.rotation.x = THREE.MathUtils.lerp(pl.rotation.x, 0, k)
      pl.rotation.z = THREE.MathUtils.lerp(pl.rotation.z, 0, k)
      pose.current = moving ? 'walk' : 'idle'

      // 靠近遗物或长椅
      if (!st.activeItem) {
        for (const it of ITEMS) {
          if (st.answers[it.id]) continue
          if (Math.hypot(world.player.x - it.pos[0], world.player.z - it.pos[1]) < 1.3) {
            world.target = null
            st.openItem(it.id)
            break
          }
        }
        if (allFound && world.player.distanceTo(BENCH) < 1.7 && !cues.current.has('sit')) {
          cues.current.add('sit')
          world.target = null
          st.setStage('sunrise')
        }
      }

      const camTarget = new V(pl.position.x + world.pointer.x * 0.6, pl.position.y + 6.2, pl.position.z + 7.8)
      camera.position.lerp(camTarget, k)
      camLook.current.lerp(new V(pl.position.x, pl.position.y + 1, pl.position.z), k)
      camera.lookAt(camLook.current)
      return
    }

    if (stage === 'sunrise' || stage === 'letter') {
      sunriseT.current += dt
      const t = sunriseT.current
      // 坐到长椅上，面朝东方
      const seat = new V(BENCH.x + 0.02, BENCH.y + 0.38, BENCH.z + 0.25)
      pl.position.lerp(seat, k * 1.5)
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0))
      pl.quaternion.slerp(q, k * 1.5)
      pose.current = 'sit'
      if (stage === 'sunrise') world.dawn = Math.min(1, Math.max(world.dawn, THREE.MathUtils.smootherstep(t, 1.5, 18)))
      const camTarget = new V(BENCH.x - 4.2, BENCH.y + 2.7, BENCH.z + 5.2)
      camera.position.lerp(camTarget, k * 0.6)
      camLook.current.lerp(new V(BENCH.x + 26, BENCH.y + 2.2, BENCH.z - 7), k * 0.6)
      camera.lookAt(camLook.current)

      if (stage === 'sunrise') {
        const st = useStore.getState()
        const beats: [number, string, () => void][] = [
          ...ITEMS.map((it, i) => [3 + i * 4, it.id, () => say(it.reflect(st.answers[it.id] ?? ''), 4000)] as [number, string, () => void]),
          [15.5, 'outro', () => say(LINES.sunriseOutro, 5000)],
          [21, 'letter', () => st.setStage('letter')],
        ]
        for (const [time, key, fn] of beats) {
          if (t > time && !cues.current.has(key)) {
            cues.current.add(key)
            fn()
          }
        }
      }
    }
  })

  const onGround = (p: THREE.Vector3) => {
    if (useStore.getState().stage !== 'island' || useStore.getState().activeItem) return
    world.target = p
  }

  return (
    <>
      <LightRig />
      <Island onGround={onGround} />
      <DistantIslands />
      <CloudField count={120} area={420} y={-24} spread={8} scale={[5, 11]} seed={7} />
      <CloudField count={30} area={330} y={4} spread={18} scale={[2, 4.5]} seed={13} avoid={30} />
      {stage === 'flight' && (
        <>
          <FlightHouse />
          <Rings playerRef={playerRef} />
        </>
      )}
      {/* 右边第二颗星星 */}
      <GlowStar position={[18, 60, -50]} size={9} color="#e9e4ff" pulse={0.5} />
      <GlowStar position={[34, 64, -40]} size={16} color="#fff1c9" />
      {ITEMS.map((it) => (
        <MemoryBeacon key={it.id} id={it.id} onPick={(p) => onGround(p)} />
      ))}
      {allFound && stage === 'island' && (
        <group position={[BENCH.x, BENCH.y, BENCH.z]}>
          <LightPillar color="#ffc9a8" height={9} radius={0.9} />
          <Sparkles count={30} scale={[2, 3, 2]} position={[0, 1.2, 0]} size={3} speed={0.3} color="#ffd8b0" />
        </group>
      )}
      <group ref={playerRef} position={curve.getPointAt(0)}>
        <Player pose={() => pose.current} />
        {/* 跟着你的小星星 */}
        <GlowStar position={[0.55, 1.85, 0.2]} size={0.9} color="#fff4cf" />
        <pointLight position={[0.5, 1.8, 0.2]} color="#ffe6b0" intensity={2.5} distance={5} decay={1.6} />
      </group>
    </>
  )
}
