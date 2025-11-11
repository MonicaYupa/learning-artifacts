'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Message {
  role: 'assistant' | 'user'
  content: string
}

interface Exercise {
  id: string
  type: 'analysis' | 'comparative' | 'framework'
  prompt: string
  material?: string
  options?: string[]
  scaffold?: { [key: string]: string }
  hints: string[]
}

interface Module {
  id: string
  topic: string
  skill_level: string
  exercises?: Exercise[]
}

export default function ModulePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your AI learning assistant. What topic would you like to learn about today, and what's your current skill level? For example, you could say 'I want to learn Python basics as a beginner' or 'I'd like to explore advanced machine learning concepts'.",
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [module, setModule] = useState<Module | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || loading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      // Call backend API to generate module based on user message
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/modules/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate module')
      }

      const data = await response.json()

      // Set the module data
      setModule({
        id: data.id,
        topic: data.title,
        skill_level: data.skill_level,
        exercises: data.exercises,
      })

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Great! I've created a learning module on "${data.title}" at the ${data.skill_level} level. Your exercises are now available in the artifact panel on the right. Let's get started!`,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm sorry, there was an error: ${err instanceof Error ? err.message : 'An unexpected error occurred'}. Please try again.`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col bg-white">
        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b border-gray-200 px-4 sm:h-14 sm:px-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <h1 className="text-base font-semibold text-gray-900 sm:text-lg">Learning Artifacts</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:px-3 sm:text-sm"
          >
            Sign Out
          </button>
        </header>

        {/* Split-screen layout - Claude artifact pattern */}
        <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
          {/* Left Panel - Chat (similar to Claude's conversation panel) */}
          <div className="flex w-full flex-col border-b border-gray-200 bg-white sm:w-2/5 sm:border-b-0 sm:border-r">
            {/* Chat Messages Area */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 sm:px-4 sm:py-6"
              role="log"
              aria-label="Chat conversation"
              aria-live="polite"
            >
              <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
                {messages.map((message, idx) => (
                  <div key={idx} className="space-y-1.5 sm:space-y-2">
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-primary-500 sm:h-6 sm:w-6">
                          <span className="text-[10px] font-semibold text-white sm:text-xs">
                            AI
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-gray-500 sm:text-xs">
                          Assistant
                        </span>
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 sm:h-6 sm:w-6">
                          <span className="text-[10px] font-semibold text-gray-700 sm:text-xs">
                            You
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-gray-500 sm:text-xs">
                          You
                        </span>
                      </div>
                    )}
                    <div className="pl-6 sm:pl-8">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 sm:text-base">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div
                    className="space-y-1.5 sm:space-y-2"
                    role="status"
                    aria-live="polite"
                    aria-label="Assistant is typing"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-primary-500 sm:h-6 sm:w-6">
                        <span className="text-[10px] font-semibold text-white sm:text-xs">AI</span>
                      </div>
                      <span className="text-[11px] font-medium text-gray-500 sm:text-xs">
                        Assistant
                      </span>
                    </div>
                    <div className="pl-6 sm:pl-8">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 animate-delay-200"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 animate-delay-400"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 bg-white p-4 sm:p-4">
              <form onSubmit={handleSendMessage}>
                <div className="relative">
                  <label htmlFor="message-input" className="sr-only">
                    Message input
                  </label>
                  <textarea
                    id="message-input"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                    placeholder="Reply to Claude..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:px-4 sm:py-3 sm:pr-14"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || loading}
                    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white transition-all hover:bg-primary-600 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10"
                    aria-label="Send message"
                  >
                    <svg
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Panel - Artifact (exercise display) */}
          <div className="flex w-full flex-col border-t border-gray-200 bg-gray-50 sm:w-3/5 sm:border-l sm:border-t-0">
            {!module ? (
              <div className="flex h-full items-center justify-center p-4 sm:p-8">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 sm:mb-4 sm:h-16 sm:w-16">
                    <svg
                      className="h-6 w-6 text-gray-400 sm:h-8 sm:w-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-sm font-medium text-gray-900 sm:text-base">
                    No exercises yet
                  </h3>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    Start a conversation to generate your personalized learning exercises.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                {/* Artifact Header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <button
                      disabled
                      className="flex-shrink-0 p-2 text-gray-400 transition-colors hover:text-gray-600 active:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Previous module"
                    >
                      <svg
                        className="h-4 w-4 sm:h-5 sm:w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-xs font-semibold text-gray-900 sm:text-sm">
                        {module.topic}
                      </h2>
                      <p className="truncate text-[10px] text-gray-500 sm:text-xs">
                        Click to open {module.skill_level} level exercises
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                    <button
                      disabled
                      className="rounded p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Copy module"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                    <button
                      disabled
                      className="rounded p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Close module"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Artifact Content */}
                <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-8">
                  <div className="mx-auto max-w-3xl">
                    <div className="mb-4 sm:mb-6">
                      <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-700 sm:px-3">
                        {module.skill_level.charAt(0).toUpperCase() + module.skill_level.slice(1)}{' '}
                        Level
                      </span>
                    </div>
                    <h1 className="mb-3 text-xl font-bold text-gray-900 sm:mb-4 sm:text-2xl">
                      {module.topic}
                    </h1>
                    <p className="text-xs text-gray-600 sm:text-sm">
                      {module.exercises?.length || 0} exercises • Interactive learning experience
                    </p>

                    {/* Placeholder for exercise content */}
                    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-8 sm:mt-8 sm:p-12">
                      <div className="text-center text-gray-500">
                        <p className="text-xs sm:text-sm">
                          Exercise content will be displayed here
                        </p>
                        <p className="mt-2 text-[10px] sm:text-xs">
                          The full exercise UI will be implemented in the next step
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Artifact Footer */}
                <div className="border-t border-gray-200 bg-white px-3 py-3 sm:px-8 sm:py-4">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 sm:text-xs">
                    <span>Last edited just now</span>
                    <button className="flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:bg-gray-100 active:bg-gray-200 sm:px-2">
                      <svg
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="hidden sm:inline">Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
