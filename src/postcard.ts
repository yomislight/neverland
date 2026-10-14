import { ITEMS, LINES, type ItemId } from './content'

const SERIF = '"Noto Serif SC", "Songti SC", serif'
const LATIN = '"Cormorant Garamond", Georgia, serif'

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrap(g: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (ch === '\n') {
      lines.push(line)
      line = ''
      continue
    }
    if (g.measureText(line + ch).width > width && line) {
      lines.push(line)
      line = ch
    } else line += ch
  }
  if (line) lines.push(line)
  return lines
}

function spaced(g: CanvasRenderingContext2D, text: string, x: number, y: number, gap: number) {
  let cx = x
  for (const ch of text) {
    g.fillText(ch, cx, y)
    cx += g.measureText(ch).width + gap
  }
}

export async function makePostcard(shot: string, letter: string, answers: Partial<Record<ItemId, string>>) {
  const W = 1080
  const H = 1440
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const body = letter.trim() || '谢谢你，一直相信魔法。'
  await Promise.all([
    document.fonts.load(`600 44px ${SERIF}`, LINES.letterTitle + body),
    document.fonts.load(`400 30px ${SERIF}`, LINES.theme + ITEMS.map((i) => i.label(answers[i.id] ?? '')).join('')),
    document.fonts.load(`500 40px ${LATIN}`, 'NEVERLAND'),
  ]).catch(() => undefined)

  // 纸张
  g.fillStyle = '#f6eddc'
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(120, 90, 60, ${Math.random() * 0.05})`
    g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
  }
  g.strokeStyle = '#d8c6a8'
  g.lineWidth = 2
  g.strokeRect(36, 36, W - 72, H - 72)

  // 照片
  const img = await loadImage(shot)
  const px = 80, py = 80, pw = W - 160, ph = 640
  g.fillStyle = '#fffaf1'
  g.shadowColor = 'rgba(60, 40, 20, 0.18)'
  g.shadowBlur = 24
  g.shadowOffsetY = 8
  g.fillRect(px - 14, py - 14, pw + 28, ph + 28)
  g.shadowColor = 'transparent'
  const scale = Math.max(pw / img.width, ph / img.height)
  const sw = pw / scale, sh = ph / scale
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, px, py, pw, ph)

  // 邮票
  const sx = 816, sy = 780, sWd = 170, sHt = 200
  g.fillStyle = '#fffaf1'
  g.fillRect(sx, sy, sWd, sHt)
  g.fillStyle = '#f6eddc'
  for (let x = sx; x <= sx + sWd; x += 17) {
    g.beginPath(); g.arc(x, sy, 6, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.arc(x, sy + sHt, 6, 0, Math.PI * 2); g.fill()
  }
  for (let y = sy; y <= sy + sHt; y += 20) {
    g.beginPath(); g.arc(sx, y, 6, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.arc(sx + sWd, y, 6, 0, Math.PI * 2); g.fill()
  }
  const grad = g.createLinearGradient(0, sy + 16, 0, sy + sHt - 16)
  grad.addColorStop(0, '#24315f')
  grad.addColorStop(0.65, '#d58f8f')
  grad.addColorStop(1, '#f4c48e')
  g.fillStyle = grad
  g.fillRect(sx + 16, sy + 16, sWd - 32, sHt - 32)
  // 邮票里的小岛和星星
  g.fillStyle = '#4c7a5a'
  g.beginPath()
  g.ellipse(sx + sWd / 2, sy + 130, 42, 10, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#5b5670'
  g.beginPath()
  g.moveTo(sx + sWd / 2 - 42, sy + 130)
  g.lineTo(sx + sWd / 2 + 42, sy + 130)
  g.lineTo(sx + sWd / 2, sy + 168)
  g.fill()
  g.fillStyle = '#fff4cf'
  const star = (cx: number, cy: number, r: number) => {
    g.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2
      const rr = i % 2 ? r * 0.3 : r
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
    }
    g.fill()
  }
  star(sx + 118, sy + 58, 16)
  star(sx + 70, sy + 48, 7)
  g.strokeStyle = 'rgba(150, 90, 70, 0.55)'
  g.lineWidth = 3
  g.beginPath()
  g.arc(sx + 20, sy + sHt - 10, 54, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = 'rgba(150, 90, 70, 0.6)'
  g.font = `400 18px ${SERIF}`
  g.textAlign = 'center'
  g.fillText('永无岛', sx + 20, sy + sHt - 4)
  g.textAlign = 'left'

  // 标题
  g.fillStyle = '#3a3346'
  g.font = `500 40px ${LATIN}`
  spaced(g, 'NEVERLAND', 90, 812, 9)
  const d = new Date()
  g.fillStyle = '#9a8670'
  g.font = `400 24px ${SERIF}`
  g.fillText(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} · 寄自永无岛`, 92, 856)

  // 信
  g.fillStyle = '#2f2a3a'
  g.font = `600 42px ${SERIF}`
  g.fillText(LINES.letterTitle, 90, 940)
  g.font = `400 36px ${SERIF}`
  const lines = wrap(g, body, 680).slice(0, 4)
  lines.forEach((l, i) => g.fillText(l, 90, 1002 + i * 58))
  g.textAlign = 'right'
  g.font = `400 26px ${SERIF}`
  g.fillStyle = '#7d6c5c'
  g.fillText('—— 长大以后的我', 990, 1002 + lines.length * 58 + 16)
  g.textAlign = 'left'

  // 带回来的东西
  const top = 1250
  g.strokeStyle = '#dccbae'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(90, top - 40)
  g.lineTo(990, top - 40)
  g.stroke()
  g.font = `400 24px ${SERIF}`
  g.fillStyle = '#8a775f'
  ITEMS.forEach((it, i) => {
    const a = answers[it.id]
    if (!a) return
    g.fillText(`✦ ${it.label(a)}`, 90 + (i % 2) * 450, top + Math.floor(i / 2) * 42)
  })

  g.textAlign = 'center'
  g.fillStyle = '#a07e5a'
  g.font = `400 24px ${SERIF}`
  g.fillText(LINES.theme, W / 2, H - 70)

  return c.toDataURL('image/jpeg', 0.92)
}
