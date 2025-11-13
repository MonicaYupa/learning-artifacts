import type { HintResponse, SubmitResponse, ApiError } from '@/types/session'
import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Delay between streaming chunks in milliseconds (adjust for faster/slower streaming)
// Lower = faster, Higher = slower (e.g., 10 = very fast, 50 = slow, 100 = very slow)
const STREAMING_DELAY_MS = 15

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

    // Provide user-friendly error messages based on status code
    let userMessage = error.message
    if (!error.message || error.message.startsWith('HTTP ')) {
      if (response.status === 401 || response.status === 403) {
        userMessage = 'Your session has expired. Please refresh the page and try again.'
      } else if (response.status === 404) {
        userMessage = 'The requested resource was not found. Please try reloading the page.'
      } else if (response.status === 422) {
        userMessage = 'There was a problem with your request. Please try again.'
      } else if (response.status >= 500) {
        userMessage = 'Our servers are experiencing issues. Please try again in a moment.'
      } else {
        userMessage = 'Something went wrong. Please try again.'
      }
    }

    throw new Error(userMessage)
  }

  return response.json()
}

/**
 * Create a new learning session for a module
 * @param moduleId - The module ID
 * @returns Promise with created session
 */
export async function createSession(moduleId: string): Promise<{ id: string }> {
  try {
    const response = await authenticatedFetch<{ id: string }>(`${API_URL}/api/sessions`, {
      method: 'POST',
      body: JSON.stringify({ module_id: moduleId }),
    })
    return response
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to create session')
  }
}

/**
 * Update the session's current exercise index
 * @param sessionId - The session ID
 * @param exerciseIndex - The current exercise index
 * @returns Promise with updated session
 */
export async function updateSessionExerciseIndex(
  sessionId: string,
  exerciseIndex: number
): Promise<void> {
  try {
    // Demo mode - skip updating
    if (sessionId.startsWith('session-')) {
      return
    }

    await authenticatedFetch<void>(`${API_URL}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ current_exercise_index: exerciseIndex }),
    })
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to update session')
  }
}

/**
 * Request a hint for the current exercise
 * @param sessionId - The session ID
 * @param hintLevel - The hint level to request (1-3)
 * @returns Promise with hint response
 */
export async function requestHint(sessionId: string, hintLevel?: number): Promise<HintResponse> {
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
        body: JSON.stringify(hintLevel ? { hint_level: hintLevel } : {}),
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
    exercise_index: number
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

/**
 * Submit an answer for assessment with streaming feedback
 * @param sessionId - The session ID
 * @param submission - The answer submission data
 * @param callbacks - Callbacks for handling stream events
 */
export async function submitAnswerStream(
  sessionId: string,
  submission: {
    answer_text: string
    time_spent_seconds: number
    hints_used: number
    exercise_index: number
  },
  callbacks: {
    onStart?: (data: { attempt_number: number; hint_available: boolean }) => void
    onContent?: (text: string) => void
    onComplete?: (response: SubmitResponse) => void
    onError?: (error: string) => void
  }
): Promise<void> {
  try {
    // Demo mode - simulate streaming
    if (sessionId.startsWith('session-')) {
      const { getMockSubmitResponse } = await import('@/lib/mock-data/exercises')
      const mockResponse = getMockSubmitResponse(submission)

      // Simulate start event
      callbacks.onStart?.({
        attempt_number: mockResponse.attempt_number,
        hint_available: mockResponse.hint_available,
      })

      // Simulate streaming feedback text
      const feedback = mockResponse.feedback
      const chunkSize = 1 // Stream character by character for more realistic effect
      for (let i = 0; i < feedback.length; i += chunkSize) {
        const chunk = feedback.slice(i, i + chunkSize)
        callbacks.onContent?.(chunk)
        await new Promise((resolve) => setTimeout(resolve, STREAMING_DELAY_MS))
      }

      // Simulate complete event
      callbacks.onComplete?.(mockResponse)
      return
    }

    const token = await getAuthToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(`${API_URL}/api/sessions/${sessionId}/submit/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(submission),
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        status_code: response.status,
      }))

      // Provide user-friendly error messages for answer submission
      let userMessage = error.message
      if (!error.message || error.message.startsWith('HTTP ')) {
        if (response.status === 401 || response.status === 403) {
          userMessage = 'Your session has expired. Please refresh the page and try again.'
        } else if (response.status === 404) {
          userMessage = 'Could not find your session. Please try reloading the page.'
        } else if (response.status === 422) {
          userMessage =
            'Unable to submit your answer. Please make sure you have entered a response and try again.'
        } else if (response.status >= 500) {
          userMessage =
            'Our servers are experiencing issues. Your answer was not submitted. Please try again in a moment.'
        } else {
          userMessage = 'Failed to submit your answer. Please try again.'
        }
      }

      throw new Error(userMessage)
    }

    // Parse SSE stream
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body')
    }

    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Process complete SSE messages (ending with \n\n)
      const messages = buffer.split('\n\n')
      buffer = messages.pop() || '' // Keep incomplete message in buffer

      for (const message of messages) {
        if (!message.trim()) continue

        // SSE format: "data: {...}"
        const dataMatch = message.match(/^data: (.+)$/m)
        if (!dataMatch) continue

        try {
          const data = JSON.parse(dataMatch[1])

          switch (data.type) {
            case 'start':
              callbacks.onStart?.({
                attempt_number: data.attempt_number,
                hint_available: data.hint_available,
              })
              break

            case 'content':
              callbacks.onContent?.(data.text)
              // Add a small delay to slow down the streaming for better readability
              await new Promise((resolve) => setTimeout(resolve, STREAMING_DELAY_MS))
              break

            case 'complete':
              callbacks.onComplete?.({
                assessment: data.assessment,
                internal_score: data.internal_score,
                feedback: data.feedback,
                attempt_number: data.attempt_number || 1,
                hint_available: data.hint_available || false,
              })
              break

            case 'error':
              callbacks.onError?.(data.message)
              break
          }
        } catch (parseError) {
          console.error('Failed to parse SSE data:', parseError)
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      callbacks.onError?.(error.message)
    } else {
      callbacks.onError?.('Failed to submit answer')
    }
  }
}
