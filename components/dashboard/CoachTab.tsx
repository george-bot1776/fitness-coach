'use client'

import { useRef, useState, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'
import { SummaryCard } from './SummaryCard'
import type { Coach, DailySummary } from '@/types'

interface Message { role: 'user' | 'coach'; text: string; imageUrl?: string; isLoading?: boolean; isError?: boolean; summary?: DailySummary }

interface Props {
  coach: Coach
  messages: Message[]
  onSend: (text: string, image?: { base64: string; mediaType: string; previewUrl: string }) => void
  onActivityLog: (text: string) => void
}

const CHIPS = [
  { label: 'Had breakfast', icon: '🍳' },
  { label: 'Just worked out', icon: '💪' },
  { label: 'Should I eat this?', icon: '🤔' },
  { label: 'Daily summary', icon: '📊' },
  { label: 'How am I doing?', icon: '📈' },
]

export function CoachTab({ coach, messages, onSend }: Props) {
  const [text, setText] = useState('')
  const [pendingImage, setPendingImage] = useState<{ base64: string; mediaType: string; previewUrl: string } | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 120
      if (isNearBottom) {
        feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
      }
    }
  }, [messages])

  // Mobile keyboard handler
  useEffect(() => {
    const handleVisualViewportChange = () => {
      if (feedRef.current) {
        const viewportHeight = window.visualViewport?.height || window.innerHeight
        const offset = window.innerHeight - viewportHeight
        if (offset > 0) {
          setTimeout(() => textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
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
      const img = new Image()
      img.onload = () => {
        const MAX = 1024
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL('image/jpeg', 0.82)
        setPendingImage({ base64: compressed.split(',')[1], mediaType: 'image/jpeg', previewUrl: compressed })
        setText('What are the macros for this food?')
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* Message feed */}
      <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: msg.summary ? '100%' : '88%', width: msg.summary ? '100%' : undefined }}>
            <MessageBubble
              role={msg.role}
              text={msg.text}
              imageUrl={msg.imageUrl}
              isLoading={msg.isLoading}
              isError={msg.isError}
              coach={coach}
            />
            {msg.summary && <SummaryCard summary={msg.summary} />}
          </div>
        ))}
      </div>

      {/* Image preview */}
      {pendingImage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.04)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage.previewUrl} alt="preview" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
          <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>📸 Photo ready to send</span>
          <button onClick={() => setPendingImage(null)} style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Quick chips */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {CHIPS.map(chip => (
          <button
            key={chip.label}
            onClick={() => { setText(chip.label); setTimeout(handleSend, 0) }}
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12,
              fontFamily: 'var(--font-dm-sans)',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span>{chip.icon}</span> {chip.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div style={{
        padding: '12px 16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--fc-bg)',
      }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />

        {/* Camera button */}
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
          }}
        >
          📷
        </button>

        {/* Text input */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '0 14px',
        }}>
          <input
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell your coach what you ate, did, or ask anything…"
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#F1F1F1',
              fontSize: 13,
              fontFamily: 'var(--font-dm-sans)',
            }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)' }}
          onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          style={{
            width: 40, height: 40, borderRadius: 14, flexShrink: 0,
            background: coach.gradient,
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
