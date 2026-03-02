'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { MessageBubble } from './MessageBubble'
import type { Coach } from '@/types'

interface Message { role: 'user' | 'coach'; text: string; imageUrl?: string; isLoading?: boolean }

interface Props {
  coach: Coach
  messages: Message[]
  onSend: (text: string, image?: { base64: string; mediaType: string; previewUrl: string }) => void
  onActivityLog: (text: string) => void
}

const CHIPS = ['Had breakfast', 'Just worked out', 'Should I eat this?', 'Daily summary', 'How am I doing?']

const ACTIVITY_TYPES = [
  { value: 'running', label: '🏃 Running', unit: 'minutes' },
  { value: 'walking', label: '🚶 Walking', unit: 'minutes' },
  { value: 'cycling', label: '🚴 Cycling', unit: 'minutes' },
  { value: 'swimming', label: '🏊 Swimming', unit: 'minutes' },
  { value: 'hiit', label: '🔥 HIIT', unit: 'minutes' },
  { value: 'weightlifting', label: '🏋️ Weightlifting', unit: 'minutes' },
  { value: 'yoga', label: '🧘 Yoga', unit: 'minutes' },
  { value: 'steps', label: '👟 Steps', unit: 'steps' },
]

export function CoachTab({ coach, messages, onSend, onActivityLog }: Props) {
  const [text, setText] = useState('')
  const [pendingImage, setPendingImage] = useState<{ base64: string; mediaType: string; previewUrl: string } | null>(null)
  const [showActivity, setShowActivity] = useState(false)
  const [actType, setActType] = useState('running')
  const [actAmount, setActAmount] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages])

  // Handle mobile keyboard - keep input visible
  useEffect(() => {
    const handleVisualViewportChange = () => {
      if (feedRef.current) {
        const viewportHeight = window.visualViewport?.height || window.innerHeight
        const offset = window.innerHeight - viewportHeight
        if (offset > 0) {
          // Keyboard is open - scroll input into view
          setTimeout(() => {
            textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 100)
        }
      }
    }

    window.visualViewport?.addEventListener('resize', handleVisualViewportChange)
    return () => window.visualViewport?.removeEventListener('resize', handleVisualViewportChange)
  }, [])

  function handleSend() {
    const t = text.trim()
    if (!t && !pendingImage) return
    onSend(t, pendingImage ?? undefined)
    setText('')
    setPendingImage(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setPendingImage({ base64: dataUrl.split(',')[1], mediaType: file.type || 'image/jpeg', previewUrl: dataUrl })
      setText('What are the macros for this food?')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleActivityLog() {
    if (!actAmount) return
    const type = ACTIVITY_TYPES.find(t => t.value === actType)!
    onActivityLog(`I just did ${actAmount} ${type.unit} of ${actType}`)
    setActAmount('')
    setShowActivity(false)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            text={msg.text}
            imageUrl={msg.imageUrl}
            isLoading={msg.isLoading}
            coach={coach}
          />
        ))}
      </div>

      {/* Image preview */}
      {pendingImage && (
        <div className="flex items-center gap-3 px-4 py-2.5"
             style={{ background: 'var(--fc-surface2)', borderTop: '1px solid var(--fc-border)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage.previewUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
          <span className="text-xs flex-1" style={{ color: 'var(--fc-text-dim)' }}>📸 Photo ready to send</span>
          <button onClick={() => setPendingImage(null)} className="text-lg" style={{ color: 'var(--fc-text-dim)' }}>✕</button>
        </div>
      )}

      {/* Activity modal */}
      {showActivity && (
        <div className="px-4 py-3 space-y-2.5 animate-fc-fade-up"
             style={{ background: 'var(--fc-surface2)', borderTop: '1px solid var(--fc-border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--fc-text-dim)' }}>
            Log Activity
          </p>
          <div className="flex gap-2">
            <Select value={actType} onValueChange={setActType}>
              <SelectTrigger className="flex-1" style={{ background: 'var(--fc-surface3)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
                {ACTIVITY_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="30" value={actAmount} onChange={e => setActAmount(e.target.value)}
                   className="w-20" style={{ background: 'var(--fc-surface3)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }} />
            <Button onClick={handleActivityLog} style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
              Log
            </Button>
          </div>
        </div>
      )}

      {/* Quick chips */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => { setText(chip); setTimeout(handleSend, 0) }}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors"
            style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text-dim)', whiteSpace: 'nowrap' }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="flex items-end gap-2 px-3 pb-4 pt-2"
           style={{ background: 'var(--fc-surface)', borderTop: '1px solid var(--fc-border)' }}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text-dim)' }}
        >
          📸
        </button>
        <button
          onClick={() => setShowActivity(v => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text-dim)' }}
        >
          🏃
        </button>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={e => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder="Tell your coach what you ate, did, or ask anything…"
          rows={1}
          className="flex-1 resize-none text-sm"
          style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)', borderRadius: '20px', padding: '10px 16px', minHeight: '38px', maxHeight: '120px', lineHeight: '1.4' }}
        />
        <button
          onClick={handleSend}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--fc-coach-accent)', color: '#000', border: 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
