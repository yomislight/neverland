import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useStore, world, type Stage } from './store'
import { Sky } from './world/Sky'
import Bedroom from './scenes/Bedroom'
import World from './scenes/World'
import Overlay from './ui/Overlay'

const OUTDOOR = ['flight', 'island', 'sunrise', 'letter']

function useInput() {
  useEffect(() => {
    const typing = (e: Event) => {
      const t = e.target as HTMLElement | null
      return t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA'
    }
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return
      world.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    const up = (e: KeyboardEvent) => world.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    const move = (e: PointerEvent) => {
      world.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    }
    const release = (e: PointerEvent) => {
      if (e.pointerType === 'touch') world.pointer.set(0, 0)
    }
    const blur = () => world.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', move)
    window.addEventListener('pointerup', release)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', move)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('blur', blur)
    }
  }, [])
}

// 竖屏（手机）时把视野放宽，避免画面被裁得太窄
function ResponsiveFov() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const aspect = useThree((s) => s.size.width / s.size.height)
  useEffect(() => {
    camera.fov = aspect < 1 ? Math.min(78, 50 + (1 - aspect) * 45) : 50
    camera.updateProjectionMatrix()
  }, [aspect, camera])
  return null
}

// 开发时可用 ?stage=island 之类直接跳到某一幕
function useDevJump() {
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const q = new URLSearchParams(location.search)
    const stage = q.get('stage') as Stage | null
    if (!stage) return
    const st = useStore.getState()
    if (q.has('found') || stage === 'sunrise' || stage === 'letter' || stage === 'home') {
      useStore.setState({ answers: { plane: '宇航员', jar: '在外婆家过暑假', bear: '外婆和外公' } })
    }
    if (stage === 'sunrise' || stage === 'letter') world.player.set(10, 0, 0)
    st.setStage(stage)
  }, [])
}

export default function App() {
  const stage = useStore((s) => s.stage)
  useInput()
  useDevJump()
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ fov: 50, near: 0.1, far: 1200, position: [0, 1.62, 3] }}
        onCreated={(state) => {
          const { gl } = state
          if (import.meta.env.DEV) Object.assign(window, { __three: state, __world: world, __store: useStore })
          world.canvas = gl.domElement
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
        }}
      >
        <ResponsiveFov />
        <Sky />
        {(stage === 'intro' || stage === 'bedroom') && <Bedroom morning={false} />}
        {stage === 'home' && <Bedroom key="home" morning />}
        {OUTDOOR.includes(stage) && <World />}
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.15} intensity={0.8} />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      </Canvas>
      <Overlay />
    </>
  )
}
