'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card style={{ background: 'var(--fc-surface)', border: '1px solid var(--fc-border)' }}>
      <CardHeader>
        <CardTitle className="text-center text-lg" style={{ fontFamily: 'var(--font-syne)' }}>
          Sign in
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" style={{ color: 'var(--fc-text-dim)', fontSize: '12px' }}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" style={{ color: 'var(--fc-text-dim)', fontSize: '12px' }}>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }}
            />
          </div>
          {error && (
            <p className="text-sm" style={{ color: 'var(--fc-danger)' }}>{error}</p>
          )}
          <Button
            type="submit"
            className="w-full font-bold"
            disabled={loading}
            style={{ background: 'var(--fc-coach-accent)', color: '#000' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm" style={{ color: 'var(--fc-text-dim)' }}>
          No account?{' '}
          <Link href="/signup" className="font-semibold hover:underline" style={{ color: 'var(--fc-coach-accent)' }}>
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
