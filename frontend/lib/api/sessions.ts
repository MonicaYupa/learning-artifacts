import type { HintResponse, SubmitResponse, ApiError } from '@/types/session'
import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Get auth token for API requests
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token || null
}

/**
 * Make authenticated API request
 */
async function authenticatedFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken()

  if (!token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: 'Unknown error',
      message: `HTTP ${response.status}: ${response.statusText}`,
      status_code: response.status,
    }))
    throw new Error(error.message || 'API request failed')
  }

  return response.json()
}

/**
 * Request a hint for the current exercise
 * @param sessionId - The session ID
 * @returns Promise with hint response
 */
export async function requestHint(sessionId: string): Promise<HintResponse> {
  try {
    // Demo mode - return mock hint response
    if (sessionId.startsWith('session-')) {
      const { getMockHintResponse } = await import('@/lib/mock-data/exercises')
      return getMockHintResponse()
    }

    const response = await authenticatedFetch<HintResponse>(
      `${API_URL}/api/sessions/${sessionId}/hint`,
      {
        method: 'POST',
      }
    )
    return response
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to request hint')
  }
}

/**
 * Submit an answer for assessment
 * @param sessionId - The session ID
 * @param submission - The answer submission data
 * @returns Promise with submit response
 */
export async function submitAnswer(
  sessionId: string,
  submission: {
    answer_text: string
    time_spent_seconds: number
    hints_used: number
  }
): Promise<SubmitResponse> {
  try {
    // Demo mode - return mock submit response
    if (sessionId.startsWith('session-')) {
      const { getMockSubmitResponse } = await import('@/lib/mock-data/exercises')
      return getMockSubmitResponse(submission)
    }

    const response = await authenticatedFetch<SubmitResponse>(
      `${API_URL}/api/sessions/${sessionId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify(submission),
      }
    )
    return response
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to submit answer')
  }
}
