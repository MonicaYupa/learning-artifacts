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
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading module...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
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
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary-600 hover:text-primary-700"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">Learning Module</h1>
              <div className="w-24"></div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {module && (
            <div className="rounded-lg bg-white p-8 shadow">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">{module.topic}</h2>
              <div className="mb-6 flex items-center space-x-4">
                <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800">
                  {module.skill_level}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                  {module.status}
                </span>
              </div>
              <p className="text-gray-600">Module ID: {module.id}</p>
              <p className="mt-2 text-gray-600">
                Created: {new Date(module.created_at).toLocaleString()}
              </p>
              <div className="mt-8 rounded-md bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  Learning content will be displayed here once the module content generation is
                  complete.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
