'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'
import HintSystem from '@/components/HintSystem'
import FeedbackDisplay from '@/components/FeedbackDisplay'
import AnswerSubmission from '@/components/AnswerSubmission'
import type { HintResponse, SubmitResponse } from '@/types/session'

interface Exercise {
  id: string
  name: string
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
  status: string
  created_at: string
  domain?: string
  exercises?: Exercise[]
}

interface ChatMessage {
  id: string
  type: 'hint' | 'feedback'
  content: string
  timestamp: Date
  assessment?: 'strong' | 'developing' | 'needs_support'
  attemptNumber?: number
  modelAnswer?: string
}

const MAX_ATTEMPTS = 3

export default function ModulePage() {
  const [module, setModule] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(1)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [sessionId] = useState(`session-${Date.now()}`) // TODO: Get from backend
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
  const [activeTab, setActiveTab] = useState<'exercise' | 'editor'>('exercise')
  const [collapsedHints, setCollapsedHints] = useState<Set<string>>(new Set())
  const editorPanelRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    const fetchModule = async () => {
      try {
        // Demo mode - load sample exercises
        if (params.id === 'demo') {
          const { getMockModule } = await import('@/lib/mock-data/exercises')
          setModule(getMockModule())
          setLoading(false)
          return
        }

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

  const currentExercise = module?.exercises?.[currentExerciseIndex]
  const totalExercises = module?.exercises?.length || 0
  const maxHints = currentExercise?.hints?.length || 3

  // Handle hint received
  const handleHintReceived = useCallback((response: HintResponse) => {
    const newMessage: ChatMessage = {
      id: `hint-${Date.now()}`,
      type: 'hint',
      content: response.hint,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, newMessage])
    setHintsUsed(response.hint_level)

    // Switch to editor tab on mobile to show hint
    if (window.innerWidth < 640) {
      setActiveTab('editor')
    }

    // Scroll to the new hint after a short delay to ensure it's rendered
    setTimeout(() => {
      if (editorPanelRef.current) {
        editorPanelRef.current.scrollTo({
          top: editorPanelRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    }, 100)
  }, [])

  // Handle submission success
  const handleSubmitSuccess = useCallback(
    (response: SubmitResponse) => {
      const newMessage: ChatMessage = {
        id: `feedback-${Date.now()}`,
        type: 'feedback',
        content: response.feedback,
        timestamp: new Date(),
        assessment: response.assessment,
        attemptNumber: currentAttemptNumber,
        modelAnswer: response.model_answer,
      }

      setChatMessages((prev) => [...prev, newMessage])

      // Auto-advance logic
      if (response.should_advance) {
        if (response.assessment === 'strong') {
          // Auto-advance after showing success message
          setIsAutoAdvancing(true)
          setTimeout(() => {
            advanceToNextExercise()
          }, 2000)
        } else if (response.show_model_answer) {
          // After 3 attempts, show model answer and advance
          setIsAutoAdvancing(true)
          setTimeout(() => {
            advanceToNextExercise()
          }, 3000)
        }
      } else {
        // Increment attempt number for retry
        setCurrentAttemptNumber((prev) => prev + 1)

        // Switch to exercise tab on mobile to show feedback
        if (window.innerWidth < 640) {
          setActiveTab('exercise')
        }
      }
    },
    [currentAttemptNumber]
  )

  const advanceToNextExercise = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      // Move to next exercise
      setCurrentExerciseIndex((prev) => prev + 1)
      resetExerciseState()
    } else {
      // Module complete
      router.push('/module')
    }
  }

  const resetExerciseState = () => {
    setCurrentAttemptNumber(1)
    setHintsUsed(0)
    setChatMessages([])
    setIsAutoAdvancing(false)
    setCollapsedHints(new Set())
  }

  const toggleHintCollapse = (hintId: string) => {
    setCollapsedHints((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(hintId)) {
        newSet.delete(hintId)
      } else {
        newSet.add(hintId)
      }
      return newSet
    })
  }

  const renderExercise = (exercise: Exercise) => {
    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Exercise Prompt */}
        <div className="animate-scaleIn rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-5 shadow-[0_8px_24px_rgba(217,119,87,0.35),0_4px_12px_rgba(0,0,0,0.2)] ring-1 ring-white/10 sm:p-6">
          <p className="relative z-10 whitespace-pre-wrap text-sm leading-7 text-white drop-shadow-sm sm:text-base sm:leading-8">
            {exercise.prompt}
          </p>
        </div>

        {/* Exercise-specific content */}
        {exercise.type === 'analysis' && exercise.material && (
          <div className="animate-fadeInUp group rounded-xl border-l-4 border-l-primary-500 border-r border-t border-b border-cream-300 bg-gradient-to-br from-white to-cream-50/50 p-4 shadow-md transition-all duration-300 hover:scale-[1.01] hover:shadow-lg sm:p-5">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700">
              <svg
                className="h-5 w-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Material to Analyze
            </h4>
            <div className="whitespace-pre-wrap rounded-lg border border-cream-200 bg-gradient-to-br from-cream-50 to-white p-4 text-sm leading-relaxed text-neutral-900 shadow-inner">
              {exercise.material}
            </div>
          </div>
        )}

        {exercise.type === 'comparative' && exercise.options && (
          <div className="animate-fadeInUp group rounded-xl border-l-4 border-l-primary-500 border-r border-t border-b border-cream-300 bg-gradient-to-br from-white to-cream-50/50 p-4 shadow-md transition-all duration-300 hover:scale-[1.01] hover:shadow-lg sm:p-5">
            <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700">
              <svg
                className="h-5 w-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Options to Compare
            </h4>
            <ul className="space-y-3">
              {exercise.options.map((option, idx) => (
                <li
                  key={idx}
                  className={`animate-slideInRight flex items-start gap-3 rounded-lg border border-cream-200 bg-gradient-to-r from-cream-50 to-white p-3.5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md stagger-${Math.min(idx + 1, 5)}`}
                >
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-xs font-bold text-white shadow-md ring-2 ring-primary-200">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium leading-relaxed text-neutral-900">
                    {option}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {exercise.type === 'framework' && (
          <div className="space-y-4">
            {exercise.scaffold && (
              <div className="animate-fadeInUp group rounded-xl border-l-4 border-l-primary-500 border-r border-t border-b border-cream-300 bg-gradient-to-br from-white to-cream-50/50 p-4 shadow-md transition-all duration-300 hover:scale-[1.01] hover:shadow-lg sm:p-5">
                <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <svg
                    className="h-5 w-5 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Framework Structure
                </h4>
                <div className="space-y-3">
                  {Object.entries(exercise.scaffold).map(([key, value], idx) => (
                    <div
                      key={key}
                      className={`animate-slideInRight group/item relative overflow-hidden rounded-lg border-l-4 border-primary-500 bg-gradient-to-r from-cream-50 via-white to-cream-50/50 p-4 shadow-sm transition-all hover:border-primary-600 hover:shadow-md stagger-${Math.min(idx + 1, 5)}`}
                    >
                      <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50 text-xs font-bold text-primary-700 opacity-60 transition-opacity group-hover/item:opacity-100">
                        {idx + 1}
                      </div>
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-800">
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {key}
                      </div>
                      <div className="pr-10 text-sm leading-relaxed text-neutral-800">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {exercise.material && (
              <div className="animate-fadeInUp stagger-2 group rounded-xl border-l-4 border-l-primary-500 border-r border-t border-b border-cream-300 bg-gradient-to-br from-white to-cream-50/50 p-4 shadow-md transition-all duration-300 hover:scale-[1.01] hover:shadow-lg sm:p-5">
                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <svg
                    className="h-5 w-5 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Reference Material
                </h4>
                <div className="whitespace-pre-wrap rounded-lg border border-cream-200 bg-gradient-to-br from-cream-50 to-white p-4 text-sm leading-relaxed text-neutral-900 shadow-inner">
                  {exercise.material}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

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
              onClick={() => router.push('/module')}
              className="mt-6 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600"
            >
              Back to Module
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="bg-dark min-h-screen">
        {/* Mobile Tab Navigation */}
        <nav
          className="border-b border-neutral-700 bg-neutral-850 sm:hidden"
          aria-label="Exercise navigation"
        >
          <div className="flex" role="tablist">
            <button
              onClick={() => setActiveTab('exercise')}
              role="tab"
              aria-selected={activeTab === 'exercise'}
              aria-controls="exercise-panel"
              className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'exercise'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Exercise
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              role="tab"
              aria-selected={activeTab === 'editor'}
              aria-controls="editor-panel"
              className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'editor'
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Workspace
            </button>
          </div>
        </nav>

        {/* Split-screen layout */}
        <main className="flex h-screen overflow-hidden sm:h-screen">
          {/* Left Panel - Exercise Card (40%) */}
          <div
            id="exercise-panel"
            role="tabpanel"
            aria-labelledby="exercise-tab"
            className={`bg-dark flex w-full flex-col p-4 sm:w-2/5 sm:p-6 lg:p-8 ${activeTab === 'exercise' ? 'block' : 'hidden sm:flex'}`}
          >
            {module && currentExercise && (
              <div className="animate-fadeInUp mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-cream-200/80 bg-cream-50 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35),0_15px_30px_-10px_rgba(0,0,0,0.25),0_0_0_1px_rgba(217,119,87,0.05)] transition-shadow duration-300 hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.4),0_20px_40px_-10px_rgba(0,0,0,0.3),0_0_0_1px_rgba(217,119,87,0.1)]">
                {/* Card Header */}
                <div className="frosted-glass flex-shrink-0 space-y-4 border-b border-cream-200/60 bg-gradient-to-b from-cream-100/70 via-cream-50/40 to-transparent p-5 shadow-sm sm:space-y-5 sm:p-6 lg:p-8">
                  {/* Back Button */}
                  <button
                    onClick={() => router.back()}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-neutral-600 transition-all hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-cream-50"
                    aria-label="Back to chat"
                  >
                    <span className="absolute inset-0 scale-0 rounded-xl bg-gradient-to-r from-cream-200 to-cream-100 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"></span>
                    <svg
                      className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    <span className="relative z-10 text-sm font-medium">Chat</span>
                  </button>

                  {/* Exercise Number and Name */}
                  <div className="space-y-2 text-center">
                    <p className="text-base font-semibold text-neutral-600 sm:text-lg lg:text-xl">
                      Exercise {currentExerciseIndex + 1}: {currentExercise.name}
                    </p>
                    <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl lg:text-3xl">
                      {module.topic?.replace(/_/g, ' ') || module.topic}
                    </h2>
                  </div>

                  {/* Topic and Level Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="animate-scaleIn rounded-full border border-primary-300 bg-gradient-to-r from-primary-100 to-primary-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-800 shadow-md">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {module.skill_level.charAt(0).toUpperCase() + module.skill_level.slice(1)}
                      </span>
                    </span>
                    {module.topic && (
                      <span className="animate-scaleIn stagger-1 rounded-full border border-neutral-300 bg-gradient-to-r from-neutral-100 to-neutral-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-neutral-700 shadow-md">
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                              clipRule="evenodd"
                            />
                            <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                          </svg>
                          {module.topic.replace(/_/g, ' ')}
                        </span>
                      </span>
                    )}
                    {currentAttemptNumber > 1 && (
                      <span className="animate-pulse-glow animate-scaleIn stagger-2 rounded-full border border-yellow-300 bg-gradient-to-r from-yellow-100 to-yellow-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-yellow-900 shadow-md">
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Attempt {currentAttemptNumber}/{MAX_ATTEMPTS}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="smooth-scroll relative flex-1 overflow-y-auto">
                  <div className="space-y-4 p-5 sm:space-y-5 sm:p-6 lg:p-8">
                    {/* Current Exercise */}
                    <div className="space-y-4">{renderExercise(currentExercise)}</div>

                    {!currentExercise && (
                      <div className="rounded-xl border-2 border-dashed border-cream-300 bg-cream-100 p-6">
                        <div className="flex items-start space-x-3">
                          <svg
                            className="h-6 w-6 flex-shrink-0 text-neutral-500"
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
                            <p className="text-sm font-medium text-neutral-800">
                              Loading exercises...
                            </p>
                            <p className="mt-1 text-sm text-neutral-600">
                              Your personalized exercises will appear here shortly.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Tracker - At bottom of card */}
                {module?.exercises && module.exercises.length > 0 && (
                  <div className="flex-shrink-0 border-t border-cream-200/80 bg-gradient-to-b from-cream-100/60 to-cream-200/40 px-5 py-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] sm:px-6 sm:py-4 lg:px-8">
                    <div className="flex items-center justify-between text-xs text-neutral-600">
                      <span className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                        <svg
                          className="h-4 w-4 text-primary-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Progress
                      </span>
                      <span className="font-bold tabular-nums">
                        {currentExerciseIndex + 1} / {module.exercises.length}
                      </span>
                    </div>
                    <div
                      className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-cream-300 to-cream-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                      role="progressbar"
                      aria-valuenow={currentExerciseIndex + 1}
                      aria-valuemin={1}
                      aria-valuemax={module.exercises.length}
                      aria-label={`Exercise ${currentExerciseIndex + 1} of ${module.exercises.length}`}
                    >
                      <div
                        className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 shadow-[0_1px_3px_rgba(217,119,87,0.5)] transition-all duration-700 ease-out"
                        style={{
                          width: `${((currentExerciseIndex + 1) / module.exercises.length) * 100}%`,
                        }}
                      >
                        <div className="absolute inset-0 animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Editor (60%) */}
          <div
            id="editor-panel"
            role="tabpanel"
            aria-labelledby="editor-tab"
            className={`bg-dark flex w-full flex-col sm:w-3/5 ${activeTab === 'editor' ? 'block' : 'hidden sm:flex'}`}
          >
            <div ref={editorPanelRef} className="flex h-full flex-col overflow-y-auto p-4 sm:p-8">
              {/* Answer Submission */}
              <div className="mb-3 sm:mb-4">
                <AnswerSubmission
                  sessionId={sessionId}
                  hintsUsed={hintsUsed}
                  onSubmitSuccess={handleSubmitSuccess}
                  renderSubmitButton={(submitProps) => (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      {/* Hint Button - Left */}
                      <HintSystem
                        sessionId={sessionId}
                        currentHintLevel={hintsUsed}
                        maxHints={maxHints}
                        onHintReceived={handleHintReceived}
                        renderHintButton={(hintProps) => (
                          <button
                            onClick={hintProps.onClick}
                            disabled={hintProps.disabled || isAutoAdvancing}
                            aria-label={
                              hintProps.allHintsUsed
                                ? 'All hints used'
                                : `Request hint ${hintProps.currentHintLevel + 1} of ${hintProps.maxHints}`
                            }
                            className="w-full rounded-lg border-2 border-neutral-600 bg-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition-all hover:bg-neutral-600 active:bg-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-700 sm:w-auto sm:px-6"
                          >
                            <span className="flex items-center justify-center gap-2">
                              {hintProps.isLoading ? (
                                <>
                                  <svg
                                    className="h-4 w-4 animate-spin"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
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
                                  <span>Loading...</span>
                                </>
                              ) : hintProps.allHintsUsed ? (
                                <>
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
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <span>All Hints Used</span>
                                </>
                              ) : (
                                <>
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
                                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                  </svg>
                                  <span>Hint</span>
                                  {hintProps.currentHintLevel > 0 && (
                                    <span className="text-xs">
                                      ({hintProps.currentHintLevel}/{hintProps.maxHints})
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                          </button>
                        )}
                      />

                      {/* Submit Button - Right */}
                      <button
                        onClick={submitProps.onClick}
                        disabled={submitProps.disabled || isAutoAdvancing}
                        aria-label={`Submit answer ${submitProps.isSubmitting ? '(submitting...)' : ''}`}
                        className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-md active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-500 disabled:hover:shadow-sm sm:w-auto sm:px-6"
                      >
                        <span className="flex items-center justify-center gap-2">
                          {submitProps.isSubmitting ? (
                            <>
                              <svg
                                className="h-4 w-4 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
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
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
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
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span>Submit</span>
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  )}
                />
              </div>

              {/* Hints Display - Below hint button */}
              {chatMessages.some((msg) => msg.type === 'hint') && (
                <div className="mb-3 space-y-3 sm:mb-4">
                  {chatMessages.map(
                    (message, idx) =>
                      message.type === 'hint' && (
                        <div
                          key={message.id}
                          className={`animate-fadeInUp stagger-${Math.min(idx + 1, 5)}`}
                        >
                          <div
                            className="rounded-lg border border-primary-500/30 bg-neutral-800"
                            role="region"
                            aria-label="Hint message"
                          >
                            <button
                              onClick={() => toggleHintCollapse(message.id)}
                              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-neutral-750 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                              aria-expanded={!collapsedHints.has(message.id)}
                            >
                              <div className="flex items-center gap-2">
                                <div className="rounded-full bg-primary-500/20 p-1.5">
                                  <svg
                                    className="h-4 w-4 text-primary-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2.5}
                                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                  </svg>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wide text-primary-400">
                                  Hint
                                </span>
                              </div>
                              <svg
                                className={`h-5 w-5 text-neutral-400 transition-transform ${collapsedHints.has(message.id) ? '' : 'rotate-180'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                            {!collapsedHints.has(message.id) && (
                              <div className="px-4 pb-4">
                                <p className="text-sm leading-relaxed text-neutral-200">
                                  {message.content}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                  )}
                </div>
              )}

              {/* Feedback Display - Below answer submission */}
              {chatMessages.length > 0 && (
                <div className="mb-3 space-y-3 sm:mb-4">
                  {chatMessages.map((message, idx) => (
                    <div
                      key={message.id}
                      className={`animate-fadeInUp stagger-${Math.min(idx + 1, 5)}`}
                    >
                      {message.type === 'feedback' && (
                        <FeedbackDisplay
                          assessment={message.assessment!}
                          feedback={message.content}
                          attemptNumber={message.attemptNumber!}
                          modelAnswer={message.modelAnswer}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Auto-advance notification */}
              {isAutoAdvancing && (
                <div
                  className="mb-3 rounded-lg border border-green-300 bg-green-50 p-3 text-center sm:mb-4"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-sm text-green-800">
                    {currentExerciseIndex < totalExercises - 1
                      ? 'Great job! Moving to next exercise...'
                      : 'Module complete! Returning to dashboard...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
