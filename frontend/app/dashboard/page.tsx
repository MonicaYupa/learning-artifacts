'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'

type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export default function DashboardPage() {
  const [topic, setTopic] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleGenerateModule = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get the session token
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError('Not authenticated')
        router.push('/auth/login')
        return
      }

      // Call backend API to generate module
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/modules/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          topic,
          skill_level: skillLevel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate module')
      }

      const data = await response.json()

      // Navigate to the learning interface with the module ID
      router.push(`/module/${data.module_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Learning Artifacts</h1>
              <button
                onClick={handleSignOut}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            {/* Learning Mode Indicator */}
            <div className="mb-6 flex items-center justify-between rounded-md bg-primary-50 p-4">
              <div className="flex items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-primary-900">Learning Mode</p>
                  <p className="text-xs text-primary-700">Active</p>
                </div>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                Enabled
              </span>
            </div>

            <h2 className="mb-6 text-center text-3xl font-bold text-gray-900">
              What would you like to learn today?
            </h2>

            <form onSubmit={handleGenerateModule} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* Topic Input */}
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
                  Topic
                </label>
                <input
                  type="text"
                  id="topic"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Python basics, Machine Learning, Web Development"
                  className="mt-1 block w-full rounded-md border-gray-300 px-4 py-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ring-1 ring-gray-300"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter any topic you want to learn about
                </p>
              </div>

              {/* Skill Level Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Skill Level</label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSkillLevel(level)}
                      className={`rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors ${
                        skillLevel === level
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="submit"
                disabled={loading || !topic}
                className="w-full rounded-md bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="mr-2 h-5 w-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating Module...
                  </span>
                ) : (
                  'Generate Learning Module'
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
