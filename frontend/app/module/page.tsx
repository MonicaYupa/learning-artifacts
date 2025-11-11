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
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [showHints, setShowHints] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'editor'>('chat')
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
          content: `Great! I've created a learning module on "${data.title}" at the ${data.skill_level} level. Your exercises are now available in the editor panel on the right. Let's get started!`,
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

  const renderExercise = (exercise: Exercise) => {
    return (
      <div className="space-y-5">
        {/* Exercise Prompt */}
        <div className="rounded-lg bg-gradient-to-r from-primary-50 to-primary-100/50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-primary-500 px-2.5 py-0.5 text-xs font-semibold text-white">
              {exercise.type.charAt(0).toUpperCase() + exercise.type.slice(1)}
            </span>
            <span className="text-xs font-medium text-primary-700">Exercise</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {exercise.prompt}
          </p>
        </div>

        {/* Exercise-specific content */}
        {exercise.type === 'analysis' && exercise.material && (
          <div className="rounded-lg border border-cream-300 bg-cream-50 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Material to Analyze
            </h4>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {exercise.material}
            </div>
          </div>
        )}

        {exercise.type === 'comparative' && exercise.options && (
          <div className="rounded-lg border border-cream-300 bg-cream-50 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Options to Compare
            </h4>
            <ul className="space-y-2">
              {exercise.options.map((option, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-800">{option}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {exercise.type === 'framework' && (
          <div className="space-y-4">
            {exercise.scaffold && (
              <div className="rounded-lg border border-cream-300 bg-cream-50 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Framework Structure
                </h4>
                <div className="space-y-3">
                  {Object.entries(exercise.scaffold).map(([key, value]) => (
                    <div key={key} className="rounded border-l-4 border-primary-400 bg-white p-3">
                      <div className="mb-1 text-xs font-semibold text-primary-700">{key}</div>
                      <div className="text-sm text-gray-600">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {exercise.material && (
              <div className="rounded-lg border border-cream-300 bg-cream-50 p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Reference Material
                </h4>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {exercise.material}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hints Section */}
        {showHints && exercise.hints && exercise.hints.length > 0 && (
          <div
            className="rounded-lg border border-primary-300 bg-primary-50/50 p-4"
            role="region"
            aria-label="Exercise hints"
            aria-live="polite"
          >
            <div className="mb-3 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <h4 className="text-sm font-semibold text-primary-900">Hints</h4>
            </div>
            <ul className="space-y-2">
              {exercise.hints.map((hint, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-primary-800">
                  <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-200 text-xs font-semibold text-primary-700">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{hint}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-cream-100">
        <header className="border-b border-cream-300 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-semibold text-gray-900">Learning Artifacts</h1>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Tab Navigation */}
        <nav className="border-b border-cream-300 bg-white lg:hidden" aria-label="Main navigation">
          <div className="flex" role="tablist">
            <button
              onClick={() => setActiveTab('chat')}
              role="tab"
              aria-selected={activeTab === 'chat'}
              aria-controls="chat-panel"
              className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'chat'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              role="tab"
              aria-selected={activeTab === 'editor'}
              aria-controls="editor-panel"
              className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'editor'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Exercise
            </button>
          </div>
        </nav>

        {/* Split-screen layout */}
        <main className="flex h-[calc(100vh-129px)] overflow-hidden lg:h-[calc(100vh-73px)]">
          {/* Left Panel - Chat UI (40%) */}
          <div
            id="chat-panel"
            role="tabpanel"
            aria-labelledby="chat-tab"
            className={`flex w-full flex-col border-r border-cream-300 bg-white lg:w-2/5 ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}
          >
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
              <div className="space-y-4">
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary-500 text-white'
                          : 'bg-cream-100 text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl bg-cream-100 px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:0.2s]"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat Input */}
            <div className="border-t border-cream-200 bg-white p-4">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                    placeholder="Type your message..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || loading}
                  className="flex h-11 items-center justify-center rounded-lg bg-primary-500 px-5 text-sm font-semibold text-white transition-all hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
              </form>
              <p className="mt-2 text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>

          {/* Right Panel - Editor (60%) */}
          <div
            id="editor-panel"
            role="tabpanel"
            aria-labelledby="editor-tab"
            className={`flex w-full flex-col bg-cream-50 lg:w-3/5 ${activeTab === 'editor' ? 'flex' : 'hidden lg:flex'}`}
          >
            {!module ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                    <svg
                      className="h-8 w-8 text-primary-500"
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
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No Module Yet</h3>
                  <p className="text-sm text-gray-600">
                    Start a conversation in the chat to generate your personalized learning
                    exercises.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col p-6 lg:p-8">
                {/* Module Header */}
                <div className="mb-6 border-b border-cream-200 pb-5">
                  <h2 className="mb-2 text-2xl font-semibold text-gray-900">{module.topic}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                      {module.skill_level.charAt(0).toUpperCase() + module.skill_level.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Current Exercise */}
                {module.exercises && module.exercises.length > 0 ? (
                  <div className="flex-1 overflow-y-auto">
                    {renderExercise(module.exercises[currentExerciseIndex])}

                    {/* Answer Area */}
                    <div className="mt-6">
                      <label
                        htmlFor="answer"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Your Response
                      </label>
                      <textarea
                        id="answer"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="h-32 w-full resize-none rounded-lg border border-gray-300 bg-white p-4 text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Type your answer here..."
                      />
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {answer.length} characters •{' '}
                          {answer.trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => setShowHints(!showHints)}
                        className="flex-1 rounded-lg border-2 border-primary-500 bg-white px-4 py-3 text-sm font-semibold text-primary-500 transition-all hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      >
                        {showHints ? 'Hide Hints' : 'Request Hint'}
                      </button>
                      <button
                        onClick={() => {
                          console.log('Submitting answer:', answer)
                        }}
                        disabled={!answer.trim()}
                        className="flex-1 rounded-lg bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Submit Answer
                      </button>
                    </div>

                    {/* Progress Tracker */}
                    {module.exercises.length > 0 && (
                      <div className="mt-4 rounded-lg border border-cream-300 bg-white p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Progress</span>
                          <span className="text-gray-600">
                            Exercise {currentExerciseIndex + 1} of {module.exercises.length}
                          </span>
                        </div>
                        <div
                          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream-200"
                          role="progressbar"
                          aria-valuenow={currentExerciseIndex + 1}
                          aria-valuemin={1}
                          aria-valuemax={module.exercises.length}
                          aria-label={`Exercise ${currentExerciseIndex + 1} of ${module.exercises.length}`}
                        >
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all duration-300"
                            style={{
                              width: `${((currentExerciseIndex + 1) / module.exercises.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
                      <p className="mt-3 text-sm text-gray-600">Loading exercises...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
