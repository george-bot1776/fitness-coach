'use client'

import { useEffect, useState } from 'react'

type State = 'loading' | 'unsupported' | 'denied' | 'disabled' | 'enabled'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

export function NotificationToggle({ userId }: { userId: string }) {
  const [state, setState] = useState<State>('loading')
  const [morningOptIn, setMorningOptIn] = useState(false)
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('denied')
      return
    }
    fetch('/api/push/subscribe')
      .then((r) => r.json())
      .then((data) => {
        if (data.subscribed) {
          setState('enabled')
          setMorningOptIn(data.morningOptIn)
        } else {
          setState('disabled')
        }
      })
      .catch(() => setState('disabled'))
  }, [userId])

  async function subscribe() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const subJson = sub.toJSON() as { endpoint: string; keys: Record<string, string> }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subJson, timezone: tz, morningOptIn: false }),
      })
      setEndpoint(subJson.endpoint)
      setMorningOptIn(false)
      setState('enabled')
    } catch {
      setState('disabled')
    } finally {
      setBusy(false)
    }
  }

  async function unsubscribe() {
    if (!endpoint) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })
      setState('disabled')
      setEndpoint(null)
    } finally {
      setBusy(false)
    }
  }

  async function toggleMorning(val: boolean) {
    if (!endpoint) return
    setMorningOptIn(val)
    await fetch('/api/push/subscribe', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, morningOptIn: val }),
    })
  }

  // Capture endpoint on mount when already subscribed
  useEffect(() => {
    if (state === 'enabled' && !endpoint) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setEndpoint(sub.endpoint)
        })
      )
    }
  }, [state, endpoint])

  if (state === 'loading') return null
  if (state === 'unsupported') return null

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white/80">Reminders</p>

      {state === 'denied' && (
        <p className="text-sm text-white/50">
          Notifications blocked. Enable them in your browser settings, then reload.
        </p>
      )}

      {state === 'disabled' && (
        <button
          onClick={subscribe}
          disabled={busy}
          className="w-full rounded-lg bg-white/10 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
        >
          {busy ? 'Enabling…' : 'Enable Reminders'}
        </button>
      )}

      {state === 'enabled' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Evening Streak Saver (7pm)</p>
              <p className="text-xs text-white/40">Only if you haven't logged that day</p>
            </div>
            <span className="text-xs text-white/40">Always on</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Morning Intention (8am)</p>
              <p className="text-xs text-white/40">Coach sends a forward-looking nudge</p>
            </div>
            <button
              onClick={() => toggleMorning(!morningOptIn)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                morningOptIn ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  morningOptIn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            onClick={unsubscribe}
            disabled={busy}
            className="w-full rounded-lg border border-white/10 py-2 text-sm text-white/50 transition hover:border-white/20 hover:text-white/70 disabled:opacity-50"
          >
            {busy ? 'Disabling…' : 'Disable Reminders'}
          </button>
        </div>
      )}
    </div>
  )
}
