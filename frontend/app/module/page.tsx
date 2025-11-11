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
        // API request failed - show helpful error to user
        const errorData = await response.json().catch(() => null)
        console.error('API request failed:', response.status, response.statusText, errorData)

        // Provide helpful feedback based on the error
        let errorMessage = `I'm having trouble understanding what you'd like to learn. Could you provide more details? For example: "I want to learn Python basics as a beginner" or "I'd like to explore advanced machine learning concepts".`

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: errorMessage,
          },
        ])
        setLoading(false)
        return
      }

      const data = await response.json()

      // Set the module data
      setModule({
        id: data.id,
        topic: data.title,
        skill_level: data.skill_level,
        exercises: data.exercises,
      })

      // Add assistant response with module info
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Great! I've created a learning module on "${data.title}" at the ${data.skill_level} level. Click below to start learning!`,
        },
      ])
      setLoading(false)
    } catch (err) {
      // Only catch unexpected errors (network failures, etc)
      console.error('Unexpected error during module generation:', err)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm sorry, I'm having trouble generating your learning module right now. Please try again in a moment, or try rephrasing your request.`,
        },
      ])
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col bg-cream-400">
        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b border-cream-500 bg-white px-4 sm:h-14 sm:px-6">
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

        {/* Full-width chat layout */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-cream-400">
          {/* Chat Messages Area - with bottom padding for sticky input */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 pb-32 sm:px-6 sm:py-8 sm:pb-40"
            role="log"
            aria-label="Chat conversation"
            aria-live="polite"
          >
            <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
              {messages.map((message, idx) => (
                <div key={idx} className="space-y-1.5 sm:space-y-2">
                  {message.role === 'assistant' ? (
                    // Assistant messages - left aligned
                    <>
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
                      <div className="pl-6 sm:pl-8">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 sm:text-base">
                          {message.content}
                        </p>

                        {/* Show module card if this is the last assistant message and module exists */}
                        {idx === messages.length - 1 && module && (
                          <div className="mt-4">
                            <button
                              onClick={() => router.push(`/module/${module.id}`)}
                              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-primary-300 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                                  <svg
                                    className="h-6 w-6 text-primary-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900">
                                    {module.topic}
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    {module.skill_level.charAt(0).toUpperCase() +
                                      module.skill_level.slice(1)}{' '}
                                    • {module.exercises?.length || 0} exercises
                                  </p>
                                </div>
                              </div>
                              <svg
                                className="h-5 w-5 flex-shrink-0 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // User messages - right aligned with background
                    <div className="flex justify-end">
                      <div className="max-w-[85%]">
                        <div className="rounded-2xl bg-primary-600 px-4 py-2.5 sm:px-5 sm:py-3">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white sm:text-base">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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

          {/* Chat Input - Sticky at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-cream-400 p-4 sm:p-6">
            <div className="mx-auto max-w-3xl">
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
        </div>
      </div>
    </ProtectedRoute>
  )
}
