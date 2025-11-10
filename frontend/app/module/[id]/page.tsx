'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Module {
  id: string
  topic: string
  skill_level: string
  status: string
  created_at: string
}

export default function ModulePage() {
  const [module, setModule] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/login')
          return
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/modules/${params.id}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch module')
        }

        const data = await response.json()
        setModule(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchModule()
  }, [params.id, router, supabase])

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-cream-100">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            <p className="mt-3 text-sm text-gray-600">Loading module...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-cream-100">
          <div className="text-center">
            <div className="rounded-lg bg-red-50 p-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-cream-100">
        <header className="border-b border-cream-300 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-primary-500 transition-colors hover:text-primary-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="font-medium">Back to Dashboard</span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
                  <div className="text-sm font-bold text-white">C</div>
                </div>
                <h1 className="text-lg font-semibold text-gray-900">Learning Module</h1>
              </div>
              <div className="w-32"></div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {module && (
            <div className="rounded-2xl bg-white p-8 shadow-lg shadow-primary-100/50 md:p-10">
              <h2 className="mb-6 text-3xl font-semibold text-gray-900">{module.topic}</h2>
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-primary-100 px-4 py-1.5 text-sm font-semibold text-primary-700">
                  {module.skill_level.charAt(0).toUpperCase() + module.skill_level.slice(1)}
                </span>
                <span className="rounded-full bg-cream-200 px-4 py-1.5 text-sm font-semibold text-gray-700">
                  {module.status}
                </span>
              </div>

              <div className="mb-8 space-y-2 rounded-lg border border-cream-300 bg-cream-50 p-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Module ID:</span> {module.id}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(module.created_at).toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30 p-6">
                <div className="flex items-start space-x-3">
                  <svg
                    className="h-6 w-6 flex-shrink-0 text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-primary-900">
                      Learning content coming soon
                    </p>
                    <p className="mt-1 text-sm text-primary-700">
                      Your personalized learning module will be displayed here once content
                      generation is complete.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
