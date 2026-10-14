// 全部声音用 Web Audio 实时合成：音乐盒旋律、柔和铺底、飞行风声、星环铃声。
// 没有任何外部音频文件，所以不存在版权问题。

type Mood = 'bedroom' | 'flight' | 'island' | 'sunrise' | 'home' | 'silent'

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

// 原创摇篮曲：每小节 8 个八分音符，0 表示休止
const MELODY = [
  64, 67, 72, 71, 67, 0, 64, 62,
  65, 69, 72, 71, 69, 0, 67, 0,
  64, 67, 72, 74, 76, 74, 72, 71,
  69, 72, 71, 67, 72, 0, 0, 0,
  76, 0, 74, 72, 71, 72, 74, 0,
  72, 0, 71, 69, 67, 0, 64, 0,
  65, 67, 69, 72, 71, 69, 67, 65,
  64, 0, 67, 0, 60, 0, 0, 0,
]
const BASS = [48, 53, 48, 55, 45, 52, 53, 48]
const CHORDS = [
  [60, 64, 67], [65, 69, 72], [60, 64, 67], [67, 71, 74],
  [57, 60, 64], [64, 67, 71], [65, 69, 72], [60, 64, 67],
]
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96]

class Audio {
  ctx: AudioContext | null = null
  master!: GainNode
  musicBus!: GainNode
  padBus!: GainNode
  windGain!: GainNode
  windFilter!: BiquadFilterNode
  reverb!: ConvolverNode
  step = 0
  nextTime = 0
  timer: number | undefined
  mood: Mood = 'silent'
  chimeIndex = 0

  start() {
    if (this.ctx) {
      this.ctx.resume()
      return
    }
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.8
    this.master.connect(ctx.destination)

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.impulse(3.2)
    const wet = ctx.createGain()
    wet.gain.value = 0.55
    this.reverb.connect(wet).connect(this.master)

    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0
    this.musicBus.connect(this.master)
    this.musicBus.connect(this.reverb)

    this.padBus = ctx.createGain()
    this.padBus.gain.value = 0
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 900
    this.padBus.connect(padFilter)
    padFilter.connect(this.master)
    padFilter.connect(this.reverb)

    // 风声：循环白噪声 + 带通滤波
    const noise = ctx.createBufferSource()
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    noise.buffer = buf
    noise.loop = true
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'bandpass'
    this.windFilter.frequency.value = 500
    this.windFilter.Q.value = 0.8
    this.windGain = ctx.createGain()
    this.windGain.gain.value = 0
    noise.connect(this.windFilter).connect(this.windGain).connect(this.master)
    noise.start()

    this.nextTime = ctx.currentTime + 0.1
    this.timer = window.setInterval(() => this.schedule(), 80)
  }

  impulse(seconds: number) {
    const ctx = this.ctx!
    const len = ctx.sampleRate * seconds
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c)
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    }
    return buf
  }

  get tempo() {
    return this.mood === 'flight' ? 92 : this.mood === 'sunrise' ? 70 : 64
  }

  schedule() {
    const ctx = this.ctx!
    while (this.nextTime < ctx.currentTime + 0.25) {
      const eighth = 60 / this.tempo / 2
      const i = this.step % MELODY.length
      const bar = Math.floor(i / 8)
      const note = MELODY[i]
      if (note) this.musicBox(midi(note), this.nextTime, 0.22)
      if (i % 8 === 0) {
        this.musicBox(midi(BASS[bar]), this.nextTime, 0.16, 3.5)
        if (this.mood !== 'bedroom') this.pad(CHORDS[bar], this.nextTime, eighth * 8)
      }
      if (this.mood === 'sunrise' && note && i % 2 === 0) this.musicBox(midi(note + 12), this.nextTime + eighth / 2, 0.07)
      this.step++
      this.nextTime += eighth
    }
  }

  musicBox(freq: number, t: number, vol: number, decay = 2.4) {
    const ctx = this.ctx!
    const out = ctx.createGain()
    out.gain.setValueAtTime(0, t)
    out.gain.linearRampToValueAtTime(vol, t + 0.004)
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    out.connect(this.musicBus)
    ;[
      [1, 1],
      [2, 0.35],
      [4.2, 0.12],
    ].forEach(([mul, g]) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * mul
      const og = ctx.createGain()
      og.gain.value = g
      o.connect(og).connect(out)
      o.start(t)
      o.stop(t + decay + 0.1)
    })
  }

  pad(notes: number[], t: number, dur: number) {
    const ctx = this.ctx!
    notes.forEach((n) => {
      ;[-6, 6].forEach((detune) => {
        const o = ctx.createOscillator()
        o.type = 'triangle'
        o.frequency.value = midi(n - 12)
        o.detune.value = detune
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35)
        g.gain.linearRampToValueAtTime(0, t + dur * 1.1)
        o.connect(g).connect(this.padBus)
        o.start(t)
        o.stop(t + dur * 1.15)
      })
    })
  }

  chime() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const n = PENTA[this.chimeIndex % PENTA.length]
    this.chimeIndex++
    this.musicBox(midi(n), t, 0.35, 3)
    this.musicBox(midi(n + 7), t + 0.06, 0.12, 2)
  }

  setMood(mood: Mood) {
    if (!this.ctx) return
    this.mood = mood
    const t = this.ctx.currentTime
    const ramp = (p: AudioParam, v: number, s = 2.5) => {
      p.cancelScheduledValues(t)
      p.setValueAtTime(p.value, t)
      p.linearRampToValueAtTime(v, t + s)
    }
    const music = { bedroom: 0.45, flight: 0.9, island: 0.75, sunrise: 1, home: 0.6, silent: 0 }[mood]
    const pad = { bedroom: 0, flight: 0.6, island: 1, sunrise: 1.2, home: 0.5, silent: 0 }[mood]
    ramp(this.musicBus.gain, music)
    ramp(this.padBus.gain, pad)
    ramp(this.windGain.gain, mood === 'flight' ? 0.22 : mood === 'island' ? 0.03 : 0)
    if (mood === 'flight') this.chimeIndex = 0
  }

  setWind(speed: number) {
    if (!this.ctx) return
    this.windFilter.frequency.setTargetAtTime(350 + speed * 900, this.ctx.currentTime, 0.2)
  }

  setMuted(m: boolean) {
    if (!this.ctx) return
    this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.1)
  }
}

export const audio = new Audio()
