'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.session) {
        // User is automatically signed in
        // Clear any existing session storage from previous sessions
        sessionStorage.clear()
        router.push('/module')
        router.refresh()
      } else {
        // Email confirmation might be required
        setSuccess(true)
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
              Create your account
            </h2>
            <p className="mt-2 text-center text-xs text-gray-600 sm:mt-3 sm:text-sm">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="rounded font-medium text-primary-500 transition-colors hover:text-primary-600 active:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
              >
                Sign in
              </Link>
            </p>
          </div>

          <form className="space-y-4 sm:space-y-5" onSubmit={handleSignup}>
            {error && (
              <div role="alert" aria-live="assertive" className="rounded-lg bg-red-50 p-3 sm:p-4">
                <div className="text-xs text-red-700 sm:text-sm">{error}</div>
              </div>
            )}
            {success && (
              <div role="status" aria-live="polite" className="rounded-lg bg-green-50 p-3 sm:p-4">
                <div className="text-xs text-green-700 sm:text-sm">
                  Account created successfully! Please check your email to verify your account.
                </div>
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:px-4 sm:py-3"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-medium text-gray-700 sm:text-sm"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:px-4 sm:py-3"
                  placeholder="Re-enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-md active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:py-3"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>
        </div>

        {/* Footer branding */}
        <p className="mt-4 text-center text-[10px] text-gray-500 sm:mt-6 sm:text-xs">
          Powered by Claude • Learning Artifacts Demo
        </p>
      </div>
    </div>
  )
}
