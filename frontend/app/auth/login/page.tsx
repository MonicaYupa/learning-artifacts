'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.session) {
        router.push('/module')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="w-full max-w-md">
        {/* Anthropic-styled card */}
        <div className="rounded-2xl bg-white p-6 shadow-lg shadow-primary-100/50 sm:p-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Welcome back
            </h2>
            <p className="mt-2 text-center text-xs text-gray-600 sm:mt-3 sm:text-sm">
              Don't have an account?{' '}
              <Link
                href="/auth/signup"
                className="rounded font-medium text-primary-500 transition-colors hover:text-primary-600 active:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
              >
                Sign up
              </Link>
            </p>
          </div>

          <form className="space-y-4 sm:space-y-5" onSubmit={handleLogin}>
            {error && (
              <div role="alert" aria-live="assertive" className="rounded-lg bg-red-50 p-3 sm:p-4">
                <div className="text-xs text-red-700 sm:text-sm">{error}</div>
              </div>
            )}

            <div className="space-y-3.5 sm:space-y-4">
              <div>
                <label
                  htmlFor="email-address"
                  className="block text-xs font-medium text-gray-700 sm:text-sm"
                >
                  Email
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:px-4 sm:py-3"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-gray-700 sm:text-sm"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:px-4 sm:py-3"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-md active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:py-3"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer branding */}
        <p className="mt-4 text-center text-[10px] text-gray-500 sm:mt-6 sm:text-xs">
          Powered by Claude • Learning Artifacts
        </p>
      </div>
    </div>
  )
}
