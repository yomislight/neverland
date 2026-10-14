import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore, world } from '../store'
import { LINES } from '../content'
import { audio } from '../audio'
import { mat, PaperPlane, FireflyJar, TeddyBear } from '../world/models'
import { GlowStar } from '../world/fx'

const W = 3.5 // 房间半宽
const UP = new THREE.Vector3(0, 1, 0)
const H = 3.2
const WIN = { x0: 0.4, x1: 2.0, y0: 1.1, y1: 2.6 }

function Box({ p, s, m, ...rest }: { p: [number, number, number]; s: [number, number, number]; m: THREE.Material; castShadow?: boolean; receiveShadow?: boolean }) {
  return (
    <mesh position={p} material={m} {...rest}>
      <boxGeometry args={s} />
    </mesh>
  )
}

function Clickable({ id, children }: { id: string; children: ReactNode }) {
  const [hover, setHover] = useState(false)
  const g = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    const s = hover ? 1.05 : 1
    g.current.scale.lerp(new THREE.Vector3(s, s, s), 1 - Math.exp(-dt * 12))
  })
  return (
    <group
      ref={g}
      onClick={(e) => {
        e.stopPropagation()
        const st = useStore.getState()
        if (st.stage !== 'bedroom') return
        st.say(LINES.bedroomObjects[id])
        bedroomClicks.add(id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      {children}
    </group>
  )
}
const bedroomClicks = new Set<string>()

function useDrawingTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 384
    const g = c.getContext('2d')!
    g.fillStyle = '#f8f1e0'
    g.fillRect(0, 0, 512, 384)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    // 太阳
    g.strokeStyle = '#f2a23a'
    g.fillStyle = '#ffc94d'
    g.lineWidth = 6
    g.beginPath()
    g.arc(420, 80, 38, 0, Math.PI * 2)
    g.fill()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      g.beginPath()
      g.moveTo(420 + Math.cos(a) * 50, 80 + Math.sin(a) * 50)
      g.lineTo(420 + Math.cos(a) * 72, 80 + Math.sin(a) * 72)
      g.stroke()
    }
    // 草地
    g.strokeStyle = '#4fa65a'
    g.lineWidth = 10
    g.beginPath()
    g.moveTo(10, 330)
    for (let x = 10; x < 510; x += 30) g.quadraticCurveTo(x + 15, 315, x + 30, 330)
    g.stroke()
    // 房子
    g.strokeStyle = '#c4553f'
    g.lineWidth = 7
    g.strokeRect(70, 190, 150, 130)
    g.beginPath()
    g.moveTo(55, 195)
    g.lineTo(145, 110)
    g.lineTo(235, 195)
    g.stroke()
    g.strokeStyle = '#3d6fb6'
    g.strokeRect(120, 250, 45, 70)
    // 歪歪扭扭的小人
    g.strokeStyle = '#2d2d3a'
    g.lineWidth = 6
    g.beginPath()
    g.arc(330, 215, 24, 0, Math.PI * 2)
    g.moveTo(330, 240)
    g.lineTo(325, 295)
    g.moveTo(326, 260)
    g.lineTo(290, 240)
    g.moveTo(326, 260)
    g.lineTo(368, 245)
    g.moveTo(325, 295)
    g.lineTo(300, 328)
    g.moveTo(325, 295)
    g.lineTo(350, 330)
    g.stroke()
    g.fillStyle = '#2d2d3a'
    g.font = 'bold 30px "Noto Serif SC", serif'
    g.fillText('我', 300, 375)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}

export default function Bedroom({ morning }: { morning: boolean }) {
  const stage = useStore((s) => s.stage)
  const answers = useStore((s) => s.answers)
  const { camera } = useThree()
  const shutterL = useRef<THREE.Group>(null!)
  const shutterR = useRef<THREE.Group>(null!)
  const minute = useRef<THREE.Group>(null!)
  const second = useRef<THREE.Group>(null!)
  const opening = useRef(0)
  const yaw = useRef(0)
  const yawTarget = useRef(0)
  const size = useThree((s) => s.size)

  // 拖动 / 滑动屏幕环顾房间（内容跟着手指走）
  useEffect(() => {
    let lastX: number | null = null
    const down = (e: PointerEvent) => (lastX = e.clientX)
    const move = (e: PointerEvent) => {
      if (lastX === null) return
      yawTarget.current = THREE.MathUtils.clamp(yawTarget.current - ((e.clientX - lastX) / window.innerWidth) * 1.6, -0.6, 0.6)
      lastX = e.clientX
    }
    const up = () => (lastX = null)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])
  const [starClicked, setStarClicked] = useState(false)
  const drawing = useDrawingTexture()

  const m = useMemo(
    () => ({
      wall: mat(morning ? '#c9c2d6' : '#4a5279'),
      wallDark: mat(morning ? '#b3abc4' : '#3d4469'),
      floor: mat('#7a5a46'),
      rug: mat('#b98ca0'),
      wood: mat('#8b6248'),
      woodDark: mat('#5e4034'),
      sheet: mat('#efe8db'),
      blanket: mat('#7b8fc7'),
      white: mat('#f3efe6'),
      frame: mat('#efe6d6'),
      glass: new THREE.MeshStandardMaterial({ color: '#bcd3ff', transparent: true, opacity: 0.15, roughness: 0.05 }),
      laptop: mat('#9aa0ad'),
      screen: new THREE.MeshBasicMaterial({ color: morning ? '#30364a' : '#9db8ff', toneMapped: false }),
      red: mat('#d65a4a'),
      yellow: mat('#f2c14e'),
      blue: mat('#5c86c9'),
      green: mat('#5aa36a'),
      clock: mat('#f7f0e0'),
      ink: mat('#2b2a33'),
      city: new THREE.MeshBasicMaterial({ color: morning ? '#9d8aa8' : '#0f1530', fog: false }),
      cityWin: new THREE.MeshBasicMaterial({ color: '#ffd889', toneMapped: false, fog: false }),
      plant: mat('#4f8f5f'),
      pot: mat('#c2774f'),
    }),
    [morning],
  )

  useEffect(() => {
    world.dawn = morning ? 1 : 0
    camera.position.set(0, 1.62, 3.0)
    if (morning) audio.setMood('home')
  }, [morning, camera])

  // 旁白：卧室开场 / 回到家
  const active = morning ? stage === 'home' : stage === 'bedroom'
  useEffect(() => {
    if (!active) return
    const say = useStore.getState().say
    const timers: number[] = []
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    if (morning) later(1300, () => say(LINES.homeClock, 3000))
    else {
      bedroomClicks.clear()
      later(600, () => say(LINES.bedroomWake, 3800))
      later(9000, () => useStore.getState().stage === 'bedroom' && say(LINES.bedroomHint, 5000))
    }
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [active, morning])

  const city = useMemo(() => {
    const out: { x: number; z: number; w: number; h: number; wins: [number, number][] }[] = []
    let seed = 9
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 16; i++) {
      const x = -26 + i * 3.6 + r() * 1.5
      const h = 4 + r() * 9
      const wins: [number, number][] = []
      for (let k = 0; k < 6; k++) if (r() < 0.45) wins.push([(r() - 0.5) * 1.6, 1 + r() * (h - 2)])
      out.push({ x, z: -24 - r() * 10, w: 2.4 + r() * 1.5, h, wins })
    }
    return out
  }, [])

  useFrame(({ clock }, dt) => {
    // 窗户打开动画
    if (starClicked || morning) opening.current = Math.min(1, opening.current + dt * 0.7)
    const o = THREE.MathUtils.smootherstep(opening.current, 0, 1) * 1.9
    shutterL.current.rotation.y = o
    shutterR.current.rotation.y = -o
    // 钟：卧室里停着，回家后重新走动
    if (morning) {
      second.current.rotation.z = -clock.elapsedTime * (Math.PI / 30)
      minute.current.rotation.z = -1.6 - clock.elapsedTime * 0.003
    }
    // 相机：轻微跟随鼠标；点击星星后推向窗户
    const k = 1 - Math.exp(-dt * 2.5)
    if (starClicked) {
      camera.position.lerp(new THREE.Vector3(1.15, 1.85, -2.6), 1 - Math.exp(-dt * 0.9))
      camera.lookAt(1.3, 2.4, -12)
    } else {
      // 竖屏时视野窄：相机退后一点、偏右一点，并允许左右滑动环顾房间
      const portrait = size.width < size.height
      const px = portrait ? 0 : world.pointer.x * 0.25
      const base = new THREE.Vector3(px + (portrait ? 0.4 : 0), 1.62 + (portrait ? 0 : world.pointer.y * 0.12), portrait ? 3.3 : 3.0)
      camera.position.lerp(base, k)
      yaw.current += (yawTarget.current + (portrait ? 0.12 : 0) - yaw.current) * (1 - Math.exp(-dt * 6))
      const dir = new THREE.Vector3(0.35 - base.x, (portrait ? 1.25 : 1.45) - base.y, -3.5 - base.z).applyAxisAngle(UP, -yaw.current)
      camera.lookAt(camera.position.clone().add(dir))
    }
  })

  const clickStar = () => {
    const st = useStore.getState()
    if (st.stage !== 'bedroom' || starClicked) return
    setStarClicked(true)
    document.body.style.cursor = ''
    st.say(LINES.bedroomStar, 3800)
    window.setTimeout(() => useStore.getState().go('flight'), 2600)
  }

  return (
    <group>
      {/* 灯光 */}
      <hemisphereLight args={[morning ? '#ffe9d6' : '#6f7fc0', morning ? '#8a6a5a' : '#2a2238', morning ? 1.4 : 0.75]} />
      {!morning && (
        <>
          <pointLight position={[2.55, 1.55, -0.85]} color="#ffb766" intensity={7} distance={9} decay={1.4} castShadow />
          <spotLight position={[1.2, 3.5, -6]} angle={0.5} penumbra={0.8} color="#9fb2ff" intensity={30} distance={14} target-position={[-0.5, 0, 1]} />
        </>
      )}
      {morning && <directionalLight position={[2.5, 4, -8]} color="#ffcf9a" intensity={4} castShadow />}

      {/* 墙、地板、天花板 */}
      <Box p={[0, -0.05, 0]} s={[W * 2, 0.1, W * 2]} m={m.floor} receiveShadow />
      <Box p={[0, H + 0.05, 0]} s={[W * 2, 0.1, W * 2]} m={m.wallDark} />
      <Box p={[-W, H / 2, 0]} s={[0.1, H, W * 2]} m={m.wall} />
      <Box p={[W, H / 2, 0]} s={[0.1, H, W * 2]} m={m.wall} />
      <Box p={[0, H / 2, W]} s={[W * 2, H, 0.1]} m={m.wall} />
      {/* 后墙，留出窗洞 */}
      <Box p={[(-W + WIN.x0) / 2, H / 2, -W]} s={[WIN.x0 + W, H, 0.15]} m={m.wall} />
      <Box p={[(W + WIN.x1) / 2, H / 2, -W]} s={[W - WIN.x1, H, 0.15]} m={m.wall} />
      <Box p={[(WIN.x0 + WIN.x1) / 2, WIN.y0 / 2, -W]} s={[WIN.x1 - WIN.x0, WIN.y0, 0.15]} m={m.wall} />
      <Box p={[(WIN.x0 + WIN.x1) / 2, (H + WIN.y1) / 2, -W]} s={[WIN.x1 - WIN.x0, H - WIN.y1, 0.15]} m={m.wall} />
      {/* 窗框与窗台 */}
      <Box p={[1.2, WIN.y0 - 0.04, -W + 0.12]} s={[1.9, 0.08, 0.36]} m={m.frame} />
      <Box p={[1.2, WIN.y1 + 0.03, -W]} s={[1.7, 0.06, 0.2]} m={m.frame} />
      <Box p={[WIN.x0 - 0.03, (WIN.y0 + WIN.y1) / 2, -W]} s={[0.06, 1.5, 0.2]} m={m.frame} />
      <Box p={[WIN.x1 + 0.03, (WIN.y0 + WIN.y1) / 2, -W]} s={[0.06, 1.5, 0.2]} m={m.frame} />
      <group ref={shutterL} position={[WIN.x0, (WIN.y0 + WIN.y1) / 2, -W - 0.02]}>
        <Box p={[0.4, 0, 0]} s={[0.78, 1.46, 0.02]} m={m.glass} />
        <Box p={[0.4, 0, 0]} s={[0.04, 1.46, 0.05]} m={m.frame} />
        <Box p={[0.4, 0, 0]} s={[0.78, 0.04, 0.05]} m={m.frame} />
        <Box p={[0.78, 0, 0]} s={[0.04, 1.46, 0.05]} m={m.frame} />
      </group>
      <group ref={shutterR} position={[WIN.x1, (WIN.y0 + WIN.y1) / 2, -W - 0.02]}>
        <Box p={[-0.4, 0, 0]} s={[0.78, 1.46, 0.02]} m={m.glass} />
        <Box p={[-0.4, 0, 0]} s={[0.04, 1.46, 0.05]} m={m.frame} />
        <Box p={[-0.4, 0, 0]} s={[0.78, 0.04, 0.05]} m={m.frame} />
        <Box p={[-0.78, 0, 0]} s={[0.04, 1.46, 0.05]} m={m.frame} />
      </group>

      {/* 窗外的城市剪影 */}
      {city.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2 - 6, b.z]}>
          <mesh material={m.city}>
            <boxGeometry args={[b.w, b.h, 2]} />
          </mesh>
          {!morning &&
            b.wins.map(([wx, wy], j) => (
              <mesh key={j} material={m.cityWin} position={[wx, wy - b.h / 2, 1.01]}>
                <planeGeometry args={[0.35, 0.45]} />
              </mesh>
            ))}
        </group>
      ))}

      {/* 那颗在等你的星星 */}
      {!morning && (
        <group position={[2.7, 3.0, -13]}>
          <GlowStar size={4.5} color="#fff1c9" />
          <mesh
            visible={false}
            onClick={(e) => {
              e.stopPropagation()
              clickStar()
            }}
            onPointerOver={() => stage === 'bedroom' && (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            <sphereGeometry args={[1.6, 8, 6]} />
          </mesh>
        </group>
      )}

      {/* 床 */}
      <group position={[-2.25, 0, -1.6]}>
        <Box p={[0, 0.25, 0]} s={[1.7, 0.5, 2.6]} m={m.wood} castShadow />
        <Box p={[0, 0.58, 0.05]} s={[1.6, 0.18, 2.45]} m={m.sheet} />
        <Box p={[0, 0.7, 0.5]} s={[1.66, 0.12, 1.5]} m={m.blanket} />
        <Box p={[0, 0.74, -0.85]} s={[1.1, 0.16, 0.5]} m={m.white} />
        <Box p={[0, 0.85, -1.33]} s={[1.7, 1.2, 0.1]} m={m.woodDark} />
        {morning && answers.bear && (
          <group position={[0.35, 0.78, -0.75]} rotation={[0, 0.5, 0]} scale={0.55}>
            <TeddyBear />
          </group>
        )}
      </group>

      {/* 地毯 */}
      <mesh position={[0, 0.011, 0.5]} rotation={[-Math.PI / 2, 0, 0]} material={m.rug} receiveShadow>
        <circleGeometry args={[1.4, 24]} />
      </mesh>

      {/* 书桌：成年人的东西 */}
      <group position={[2.75, 0, -0.6]}>
        <Box p={[0, 0.76, 0]} s={[1.0, 0.06, 2.0]} m={m.wood} castShadow />
        {[[-0.42, -0.9], [0.42, -0.9], [-0.42, 0.9], [0.42, 0.9]].map(([x, z], i) => (
          <Box key={i} p={[x, 0.37, z]} s={[0.06, 0.74, 0.06]} m={m.woodDark} />
        ))}
        <Clickable id="laptop">
          <group position={[-0.05, 0.8, 0.25]} rotation={[0, -Math.PI / 2, 0]}>
            <Box p={[0, 0.01, 0]} s={[0.6, 0.02, 0.4]} m={m.laptop} />
            <group position={[0, 0.02, -0.2]} rotation={[-0.25, 0, 0]}>
              <Box p={[0, 0.2, 0]} s={[0.6, 0.4, 0.02]} m={m.laptop} />
              <mesh position={[0, 0.2, 0.012]} material={m.screen}>
                <planeGeometry args={[0.54, 0.34]} />
              </mesh>
            </group>
          </group>
        </Clickable>
        <mesh position={[0.15, 0.85, -0.35]} material={m.white}>
          <cylinderGeometry args={[0.06, 0.05, 0.13, 8]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} p={[0.1, 0.8 + i * 0.012, -0.7 + (i % 2) * 0.03]} s={[0.32, 0.01, 0.42]} m={m.white} />
        ))}
        {/* 台灯 */}
        <group position={[0.25, 0.79, -0.25]}>
          <mesh material={m.ink}>
            <cylinderGeometry args={[0.1, 0.12, 0.03, 10]} />
          </mesh>
          <mesh material={m.ink} position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.6, 5]} />
          </mesh>
          <mesh position={[-0.05, 0.62, 0]} rotation={[0, 0, 0.5]}>
            <coneGeometry args={[0.14, 0.18, 10, 1, true]} />
            <meshStandardMaterial color="#f5d29a" emissive={morning ? '#000000' : '#ffb766'} emissiveIntensity={1.2} side={THREE.DoubleSide} />
          </mesh>
        </group>
        {morning && answers.plane && (
          <group position={[0, 0.88, 0.05]} scale={0.6}>
            <PaperPlane />
          </group>
        )}
      </group>

      {/* 墙上的钟 */}
      <Clickable id="clock">
        <group position={[-0.8, 2.3, -W + 0.09]}>
          <mesh material={m.clock} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.05, 20]} />
          </mesh>
          <mesh material={m.woodDark} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.01]}>
            <cylinderGeometry args={[0.36, 0.36, 0.04, 20]} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => (
            <Box key={i} p={[Math.sin((i / 12) * Math.PI * 2) * 0.26, Math.cos((i / 12) * Math.PI * 2) * 0.26, 0.03]} s={[0.025, 0.025, 0.01]} m={m.ink} />
          ))}
          <group rotation={[0, 0, -0.52]} position={[0, 0, 0.035]}>
            <Box p={[0, 0.09, 0]} s={[0.03, 0.18, 0.01]} m={m.ink} />
          </group>
          <group ref={minute} rotation={[0, 0, -1.6]} position={[0, 0, 0.04]}>
            <Box p={[0, 0.12, 0]} s={[0.02, 0.24, 0.01]} m={m.ink} />
          </group>
          <group ref={second} rotation={[0, 0, 0.3]} position={[0, 0, 0.045]}>
            <Box p={[0, 0.1, 0]} s={[0.008, 0.24, 0.008]} m={m.red} />
          </group>
        </group>
      </Clickable>

      {/* 小时候的画 */}
      <Clickable id="drawing">
        <mesh position={[-W + 0.07, 1.95, 0.4]} rotation={[0, Math.PI / 2, 0.04]}>
          <planeGeometry args={[0.9, 0.68]} />
          <meshStandardMaterial map={drawing} roughness={1} />
        </mesh>
      </Clickable>

      {/* 旧玩具箱 */}
      <Clickable id="toybox">
        <group position={[-0.55, 0, -2.75]} rotation={[0, 0.2, 0]}>
          <Box p={[0, 0.25, 0]} s={[0.9, 0.5, 0.55]} m={m.wood} castShadow />
          <group position={[0, 0.52, -0.28]} rotation={[-1.1, 0, 0]}>
            <Box p={[0, 0, 0.27]} s={[0.92, 0.04, 0.56]} m={m.woodDark} />
          </group>
          <group position={[0.2, 0.55, 0.05]} rotation={[0.1, 0, -0.25]}>
            <mesh material={m.white}>
              <cylinderGeometry args={[0.07, 0.07, 0.3, 8]} />
            </mesh>
            <mesh material={m.red} position={[0, 0.22, 0]}>
              <coneGeometry args={[0.07, 0.15, 8]} />
            </mesh>
          </group>
          <mesh material={m.blue} position={[-0.2, 0.55, 0.05]}>
            <icosahedronGeometry args={[0.12, 1]} />
          </mesh>
          <Box p={[-0.05, 0.52, -0.1]} s={[0.12, 0.12, 0.12]} m={m.yellow} />
          <Box p={[0.32, 0.5, -0.12]} s={[0.1, 0.1, 0.1]} m={m.green} />
        </group>
      </Clickable>

      {/* 盆栽 */}
      <group position={[3.0, 0, -3.0]}>
        <mesh material={m.pot} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.2, 0.15, 0.4, 8]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={m.plant} position={[Math.sin(i * 2) * 0.1, 0.6 + i * 0.12, Math.cos(i * 2) * 0.1]}>
            <icosahedronGeometry args={[0.2 - i * 0.03, 0]} />
          </mesh>
        ))}
      </group>

      {morning && answers.jar && (
        <group position={[1.6, WIN.y0, -W + 0.12]} scale={0.7}>
          <FireflyJar />
        </group>
      )}
    </group>
  )
}
