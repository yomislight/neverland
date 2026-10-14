import { create } from 'zustand'
import * as THREE from 'three'
import type { ItemId } from './content'

export type Stage = 'intro' | 'bedroom' | 'flight' | 'island' | 'sunrise' | 'letter' | 'home'

interface State {
  stage: Stage
  fading: boolean
  caption: { text: string; id: number } | null
  activeItem: ItemId | null
  answers: Partial<Record<ItemId, string>>
  letter: string
  postcard: string | null
  muted: boolean
  setStage: (s: Stage) => void
  go: (s: Stage, onSwitch?: () => void) => void
  say: (text: string, ms?: number) => void
  openItem: (id: ItemId | null) => void
  answer: (id: ItemId, text: string) => void
  setLetter: (t: string) => void
  setPostcard: (url: string) => void
  toggleMute: () => void
  reset: () => void
}

let captionTimer: number | undefined
let captionSeq = 0

export const useStore = create<State>((set, get) => ({
  stage: 'intro',
  fading: false,
  caption: null,
  activeItem: null,
  answers: {},
  letter: '',
  postcard: null,
  muted: false,
  setStage: (stage) => set({ stage }),
  go: (stage, onSwitch) => {
    if (get().fading) return
    set({ fading: true })
    window.setTimeout(() => {
      onSwitch?.()
      set({ stage })
      // 等新场景真正画出几帧（首帧会编译着色器、可能卡顿）再淡出
      let n = 0
      const tick = () => (++n < 4 ? requestAnimationFrame(tick) : window.setTimeout(() => set({ fading: false }), 300))
      requestAnimationFrame(tick)
    }, 1300)
  },
  say: (text, ms = 4200) => {
    window.clearTimeout(captionTimer)
    set({ caption: { text, id: ++captionSeq } })
    captionTimer = window.setTimeout(() => set({ caption: null }), ms)
  },
  openItem: (activeItem) => set({ activeItem }),
  answer: (id, text) => set((s) => ({ answers: { ...s.answers, [id]: text }, activeItem: null })),
  setLetter: (letter) => set({ letter }),
  setPostcard: (postcard) => set({ postcard }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  reset: () => {
    world.dawn = 0
    world.player.set(-8, 0, 2)
    world.target = null
    set({ answers: {}, letter: '', postcard: null, activeItem: null })
  },
}))

// 每帧都会变的数据放在这里，避免触发 React 重渲染。
export const world = {
  dawn: 0,
  player: new THREE.Vector3(-8, 0, 2),
  target: null as THREE.Vector3 | null,
  keys: new Set<string>(),
  pointer: new THREE.Vector2(),
  canvas: null as HTMLCanvasElement | null,
}

export const SUN_DIR = new THREE.Vector3(1, 0.09, 0.12).normalize()
export const MOON_DIR = new THREE.Vector3(-0.45, 0.55, -0.7).normalize()
