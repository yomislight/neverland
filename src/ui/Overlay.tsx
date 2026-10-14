import { useEffect, useState } from 'react'
import { useStore, world } from '../store'
import { ITEMS, LINES, HINTS, TOUCH_HINTS, type ItemId } from '../content'
import { audio } from '../audio'
import { makePostcard } from '../postcard'

function Icon({ id }: { id: ItemId }) {
  if (id === 'plane')
    return (
      <svg viewBox="0 0 32 32" aria-hidden>
        <path d="M3 15 29 5 19 27 15 18Z" fill="currentColor" opacity=".9" />
        <path d="M15 18 29 5" stroke="var(--night)" strokeWidth="1.2" fill="none" />
      </svg>
    )
  if (id === 'jar')
    return (
      <svg viewBox="0 0 32 32" aria-hidden>
        <rect x="9" y="5" width="14" height="4" rx="1" fill="currentColor" />
        <rect x="8" y="9" width="16" height="19" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="13" cy="17" r="1.6" fill="currentColor" />
        <circle cx="19" cy="21" r="1.6" fill="currentColor" />
        <circle cx="17" cy="14" r="1.1" fill="currentColor" />
      </svg>
    )
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <circle cx="10" cy="8" r="3.5" fill="currentColor" />
      <circle cx="22" cy="8" r="3.5" fill="currentColor" />
      <circle cx="16" cy="13" r="7" fill="currentColor" />
      <ellipse cx="16" cy="24" rx="8" ry="6.5" fill="currentColor" />
    </svg>
  )
}

function Intro() {
  const stage = useStore((s) => s.stage)
  const [leaving, setLeaving] = useState(false)
  if (stage !== 'intro') return null
  const start = () => {
    audio.start()
    audio.setMood('bedroom')
    setLeaving(true)
    window.setTimeout(() => useStore.getState().setStage('bedroom'), 1400)
  }
  return (
    <div className={`intro ${leaving ? 'leaving' : ''}`}>
      <div className="intro-inner">
        <p className="eyebrow">An interactive fairy tale</p>
        <h1>NEVERLAND</h1>
        <p className="subtitle">致那个不想长大的自己</p>
        <p className="question">{LINES.introQuestion}</p>
        <button className="btn primary" onClick={start}>
          开始 · 约 3 分钟
        </button>
        <p className="small">建议戴上耳机</p>
      </div>
    </div>
  )
}

function Caption() {
  const caption = useStore((s) => s.caption)
  return (
    <div className="caption-wrap" aria-live="polite">
      {caption && (
        <p key={caption.id} className="caption">
          {caption.text}
        </p>
      )}
    </div>
  )
}

function Hint() {
  const stage = useStore((s) => s.stage)
  const [shown, setShown] = useState<string | null>(null)
  useEffect(() => {
    const touch = window.matchMedia('(pointer: coarse)').matches
    const h = (touch ? TOUCH_HINTS : HINTS)[stage] ?? null
    setShown(h)
    if (!h) return
    const t = window.setTimeout(() => setShown(null), stage === 'island' ? 14000 : 9000)
    return () => window.clearTimeout(t)
  }, [stage])
  return shown ? <div className="hint">{shown}</div> : null
}

function Backpack() {
  const stage = useStore((s) => s.stage)
  const answers = useStore((s) => s.answers)
  if (!['island', 'sunrise'].includes(stage)) return null
  return (
    <div className="backpack" aria-label="童年背包">
      <span className="backpack-label">童年背包</span>
      {ITEMS.map((it) => (
        <span key={it.id} className={`slot ${answers[it.id] ? 'filled' : ''}`} title={answers[it.id] ? it.name : '还没找到'}>
          <Icon id={it.id} />
        </span>
      ))}
    </div>
  )
}

function QuestionCard() {
  const id = useStore((s) => s.activeItem)
  const answer = useStore((s) => s.answer)
  const [choice, setChoice] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [writing, setWriting] = useState(false)
  useEffect(() => {
    setChoice(null)
    setCustom('')
    setWriting(false)
  }, [id])
  if (!id) return null
  const item = ITEMS.find((i) => i.id === id)!
  const value = writing ? custom.trim() : choice
  const submit = () => {
    if (!value) return
    audio.chime()
    answer(id, value)
  }
  return (
    <div className="modal-backdrop">
      <div className="card" role="dialog" aria-labelledby="q-title">
        <div className="card-icon">
          <Icon id={id} />
        </div>
        <p className="card-kicker">你找到了{item.name}</p>
        <p className="card-found">{item.found}</p>
        <h2 id="q-title">{item.question}</h2>
        <div className="chips">
          {item.options.map((o) => (
            <button
              key={o}
              className={`chip ${!writing && choice === o ? 'on' : ''}`}
              onClick={() => {
                setWriting(false)
                setChoice(o)
              }}
            >
              {o}
            </button>
          ))}
          <button className={`chip ${writing ? 'on' : ''}`} onClick={() => setWriting(true)}>
            我想自己写
          </button>
        </div>
        {writing && (
          <input
            className="field"
            autoFocus
            maxLength={16}
            placeholder="写下你的答案"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        )}
        <button className="btn primary" disabled={!value} onClick={submit}>
          放进童年背包
        </button>
      </div>
    </div>
  )
}

function LetterCard() {
  const stage = useStore((s) => s.stage)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  if (stage !== 'letter') return null
  const send = async () => {
    if (busy) return
    setBusy(true)
    const st = useStore.getState()
    const shot = world.canvas?.toDataURL('image/jpeg', 0.92) ?? ''
    try {
      const url = await makePostcard(shot, text, st.answers)
      st.setPostcard(url)
    } catch (err) {
      console.error(err)
    }
    st.setLetter(text)
    audio.chime()
    st.go('home')
  }
  return (
    <div className="letter-wrap">
      <div className="card letter">
        <p className="card-kicker">写一封信，寄给小时候的自己</p>
        <h2>{LINES.letterTitle}</h2>
        <textarea
          className="field"
          rows={3}
          maxLength={60}
          autoFocus
          placeholder="比如：谢谢你，那时候没有放弃画画。"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="letter-foot">
          <span className="count">{text.length} / 60</span>
          <button className="btn primary" onClick={send} disabled={busy}>
            {busy ? '正在寄出…' : '寄出这封信'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Ending() {
  const stage = useStore((s) => s.stage)
  const postcard = useStore((s) => s.postcard)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (stage !== 'home') return setShow(false)
    const t2 = window.setTimeout(() => useStore.getState().say(LINES.ending, 4400), 4600)
    const t = window.setTimeout(() => setShow(true), 9400)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [stage])
  if (stage !== 'home' || !show) return null
  const canShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
  const share = async () => {
    if (!postcard) return
    const blob = await (await fetch(postcard)).blob()
    const file = new File([blob], 'neverland-postcard.jpg', { type: 'image/jpeg' })
    if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'NEVERLAND', text: LINES.theme }).catch(() => undefined)
  }
  const again = () =>
    useStore.getState().go('bedroom', () => {
      useStore.getState().reset()
    })
  return (
    <div className="ending">
      <div className="ending-inner">
        {postcard && <img className="postcard" src={postcard} alt="你的童年明信片" />}
        <p className="ending-line">{LINES.ending}</p>
        <div className="row">
          {postcard && (
            <a className="btn primary" href={postcard} download="neverland-postcard.jpg">
              保存明信片
            </a>
          )}
          {canShare && postcard && (
            <button className="btn" onClick={share}>
              分享
            </button>
          )}
          <button className="btn ghost" onClick={again}>
            再飞一次
          </button>
        </div>
        <p className="small">手机上也可以长按图片保存</p>
      </div>
    </div>
  )
}

function Mute() {
  const muted = useStore((s) => s.muted)
  const toggle = useStore((s) => s.toggleMute)
  const stage = useStore((s) => s.stage)
  useEffect(() => audio.setMuted(muted), [muted])
  if (stage === 'intro') return null
  return (
    <button className="mute" onClick={toggle} aria-label={muted ? '打开声音' : '关闭声音'}>
      {muted ? (
        <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.8" /></svg>
      ) : (
        <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>
      )}
    </button>
  )
}

export default function Overlay() {
  const fading = useStore((s) => s.fading)
  return (
    <>
      <Caption />
      <Hint />
      <Backpack />
      <QuestionCard />
      <LetterCard />
      <Ending />
      <Mute />
      <div className={`fade ${fading ? 'on' : ''}`} />
      <Intro />
    </>
  )
}
