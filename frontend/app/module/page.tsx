'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'
import RobotLogo from '@/components/RobotLogo'

interface Message {
  role: 'assistant' | 'user'
  content: string
  moduleId?: string // Link message to a module
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

interface ModuleProgress {
  completedExercises: number[]
  exerciseResponses: Record<number, string>
}

type ModuleStatus = 'Not Started' | 'In Progress' | 'Completed'

const getModuleStatus = (moduleId: string, totalExercises: number): ModuleStatus => {
  if (typeof window === 'undefined' || totalExercises === 0) return 'Not Started'

  const storageKey = `module_${moduleId}_progress`
  const saved = localStorage.getItem(storageKey)

  if (!saved) return 'Not Started'

  try {
    const progress: ModuleProgress = JSON.parse(saved)
    const completedCount = progress.completedExercises?.length || 0

    if (completedCount === 0) return 'Not Started'
    if (completedCount >= totalExercises) return 'Completed'
    return 'In Progress'
  } catch {
    return 'Not Started'
  }
}

const getInitialMessages = (): Message[] => {
  if (typeof window === 'undefined') {
    return [
      {
        role: 'assistant',
        content:
          "Hello! I'm Claude Learn, your AI learning assistant. What topic would you like to learn about today, and what's your current skill level? For example, you could say 'I want to learn Python basics as a beginner' or 'I'd like to explore advanced machine learning concepts'.",
      },
    ]
  }

  const savedMessages = sessionStorage.getItem('chatMessages')
  if (savedMessages) {
    try {
      return JSON.parse(savedMessages)
    } catch (e) {
      console.error('Failed to restore messages:', e)
    }
  }

  return [
    {
      role: 'assistant',
      content:
        "Hello! I'm Claude Learn, your AI learning assistant. What topic would you like to learn about today, and what's your current skill level? For example, you could say 'I want to learn Python basics as a beginner' or 'I'd like to explore advanced machine learning concepts'.",
    },
  ]
}

const getInitialModules = (): Record<string, Module> => {
  if (typeof window === 'undefined') return {}

  const savedModules = sessionStorage.getItem('chatModules')
  if (savedModules) {
    try {
      return JSON.parse(savedModules)
    } catch (e) {
      console.error('Failed to restore modules:', e)
    }
  }
  return {}
}

export default function ModulePage() {
  const [messages, setMessages] = useState<Message[]>(getInitialMessages)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [modules, setModules] = useState<Record<string, Module>>(getInitialModules)
  const [moduleStatuses, setModuleStatuses] = useState<Record<string, ModuleStatus>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Save chat state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('chatMessages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    sessionStorage.setItem('chatModules', JSON.stringify(modules))
  }, [modules])

  // Calculate module statuses whenever modules change
  useEffect(() => {
    const statuses: Record<string, ModuleStatus> = {}
    Object.entries(modules).forEach(([id, module]) => {
      statuses[id] = getModuleStatus(id, module.exercises?.length || 0)
    })
    setModuleStatuses(statuses)
  }, [modules])

  // Listen for storage changes to update statuses when progress is made in module page
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('module_') && e.key?.endsWith('_progress')) {
        // Re-calculate all module statuses
        const statuses: Record<string, ModuleStatus> = {}
        Object.entries(modules).forEach(([id, module]) => {
          statuses[id] = getModuleStatus(id, module.exercises?.length || 0)
        })
        setModuleStatuses(statuses)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [modules])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Check if we should scroll to bottom on mount (coming from module page)
  useEffect(() => {
    const shouldScroll = sessionStorage.getItem('scrollToBottom')
    if (shouldScroll === 'true') {
      sessionStorage.removeItem('scrollToBottom')
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    // Use window.location for a hard redirect to ensure proper cleanup
    window.location.href = '/auth/login'
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

      // Debug: Check token algorithm
      try {
        const tokenParts = session.access_token.split('.')
        const header = JSON.parse(atob(tokenParts[0]))
        console.log('[DEBUG] Token algorithm:', header.alg, 'kid:', header.kid)
      } catch (e) {
        console.error('Failed to decode token header:', e)
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

      const newModule = {
        id: data.id,
        topic: data.title,
        skill_level: data.skill_level,
        exercises: data.exercises,
      }

      // Store the module in the modules dictionary
      setModules((prev) => ({
        ...prev,
        [data.id]: newModule,
      }))

      // Add assistant response with module info, linked to the module ID
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Great! I've created a learning module on "${data.title}" at the ${data.skill_level} level. Click below to start learning!`,
          moduleId: data.id,
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
      <div className="bg-dark flex h-screen flex-col">
        {/* Header */}
        <header className="bg-dark-lighter flex h-12 items-center justify-between border-b border-neutral-700 px-4 sm:h-14 sm:px-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <h1 className="text-base font-semibold text-neutral-100 sm:text-lg">
              Learning Artifacts
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 active:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 sm:px-3 sm:text-sm"
          >
            Sign Out
          </button>
        </header>

        {/* Full-width chat layout */}
        <div className="bg-dark relative flex flex-1 flex-col overflow-hidden">
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
                        <div className="flex h-5 w-5 items-center justify-center sm:h-6 sm:w-6">
                          <RobotLogo />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-400 sm:text-xs">
                          Claude Learn
                        </span>
                      </div>
                      <div className="pl-6 sm:pl-8">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200 sm:text-base">
                          {message.content}
                        </p>

                        {/* Show module card if this message has an associated module */}
                        {message.moduleId && modules[message.moduleId] && (
                          <div className="mt-4">
                            <button
                              onClick={() => router.push(`/module/${message.moduleId}`)}
                              className="flex w-full items-center justify-between rounded-lg border-2 border-primary-500/30 p-4 text-left transition-all hover:border-primary-500 hover:bg-neutral-800/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500/20">
                                  <svg
                                    className="h-6 w-6 text-primary-400"
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
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-neutral-100">
                                      {modules[message.moduleId].topic}
                                    </h3>
                                    {moduleStatuses[message.moduleId] && (
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                          moduleStatuses[message.moduleId] === 'Completed'
                                            ? 'bg-green-500/20 text-green-400'
                                            : moduleStatuses[message.moduleId] === 'In Progress'
                                              ? 'bg-yellow-500/20 text-yellow-400'
                                              : 'bg-neutral-600/50 text-neutral-400'
                                        }`}
                                      >
                                        {moduleStatuses[message.moduleId]}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-neutral-400">
                                    {modules[message.moduleId].skill_level.charAt(0).toUpperCase() +
                                      modules[message.moduleId].skill_level.slice(1)}{' '}
                                    • {modules[message.moduleId].exercises?.length || 0} exercises
                                  </p>
                                </div>
                              </div>
                              <svg
                                className="h-5 w-5 flex-shrink-0 text-neutral-500"
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
                        <div className="rounded-2xl bg-neutral-600 px-4 py-2.5 sm:px-5 sm:py-3">
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
                  aria-label="Claude Learn is typing"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex h-5 w-5 items-center justify-center sm:h-6 sm:w-6">
                      <RobotLogo />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-400 sm:text-xs">
                      Claude Learn
                    </span>
                  </div>
                  <div className="pl-6 sm:pl-8">
                    <div className="flex items-center space-x-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 animate-delay-200"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 animate-delay-400"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input - Sticky at bottom */}
          <div className="bg-dark absolute bottom-0 left-0 right-0 p-4 pb-6 sm:p-6 sm:pb-8">
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
                    placeholder="What would you like to learn?"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-neutral-700 bg-chat-input px-4 py-3 pr-12 text-sm text-neutral-100 placeholder-neutral-400 transition-colors focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/30 sm:px-4 sm:py-3 sm:pr-14"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || loading}
                    className="absolute bottom-4 right-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white transition-all hover:bg-primary-600 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:bottom-5 sm:h-10 sm:w-10"
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
