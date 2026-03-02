export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4"
         style={{ background: 'var(--fc-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl mb-3">🏋️</div>
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-syne)' }}>
            Fitness Coach AI
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fc-text-dim)' }}>
            Your AI-powered nutrition &amp; fitness companion
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
