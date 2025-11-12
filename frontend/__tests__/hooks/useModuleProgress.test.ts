import { renderHook, act, waitFor } from '@testing-library/react'
import { useModuleProgress } from '@/hooks/useModuleProgress'
import type { ExerciseMessage } from '@/types/exercise'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useModuleProgress', () => {
  const moduleId = 'test-module-123'
  const storageKey = `module_${moduleId}_progress`

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useModuleProgress(moduleId))

    expect(result.current.completedExercises.size).toBe(0)
    expect(result.current.exerciseResponses.size).toBe(0)
    expect(result.current.exerciseHints.size).toBe(0)
    expect(result.current.exerciseHintMessages.size).toBe(0)
    expect(result.current.exerciseFeedbackMessages.size).toBe(0)
    expect(result.current.exerciseAssessments.size).toBe(0)
  })

  it('should load progress from localStorage on mount', () => {
    const savedProgress = {
      completedExercises: [0, 1],
      exerciseResponses: { 0: 'Test answer 1', 1: 'Test answer 2' },
      exerciseHints: { 0: 2, 1: 1 },
      exerciseHintMessages: {},
      exerciseFeedbackMessages: {},
      exerciseAssessments: { 0: 'strong', 1: 'developing' },
    }
    localStorage.setItem(storageKey, JSON.stringify(savedProgress))

    const { result } = renderHook(() => useModuleProgress(moduleId))

    // Wait for loading to complete
    act(() => {
      // Loading completes in useEffect
    })

    expect(result.current.completedExercises.has(0)).toBe(true)
    expect(result.current.completedExercises.has(1)).toBe(true)
    expect(result.current.exerciseResponses.get(0)).toBe('Test answer 1')
    expect(result.current.exerciseHints.get(0)).toBe(2)
    expect(result.current.exerciseAssessments.get(0)).toBe('strong')
  })

  it('should complete an exercise', async () => {
    const { result } = renderHook(() => useModuleProgress(moduleId))

    act(() => {
      result.current.completeExercise(0)
    })

    expect(result.current.completedExercises.has(0)).toBe(true)

    // Wait for debounced localStorage save
    await waitFor(
      () => {
        const saved = localStorage.getItem(storageKey)
        expect(saved).toBeTruthy()
        const parsed = JSON.parse(saved!)
        expect(parsed.completedExercises).toContain(0)
      },
      { timeout: 1000 }
    )
  })

  it('should save exercise response', async () => {
    const { result } = renderHook(() => useModuleProgress(moduleId))

    act(() => {
      result.current.saveResponse(0, 'My test answer')
    })

    expect(result.current.exerciseResponses.get(0)).toBe('My test answer')

    await waitFor(
      () => {
        const saved = localStorage.getItem(storageKey)
        expect(saved).toBeTruthy()
        const parsed = JSON.parse(saved!)
        expect(parsed.exerciseResponses['0']).toBe('My test answer')
      },
      { timeout: 1000 }
    )
  })

  it('should save hints used', async () => {
    const { result } = renderHook(() => useModuleProgress(moduleId))

    act(() => {
      result.current.saveHints(0, 2)
    })

    expect(result.current.exerciseHints.get(0)).toBe(2)

    await waitFor(
      () => {
        const saved = localStorage.getItem(storageKey)
        expect(saved).toBeTruthy()
        const parsed = JSON.parse(saved!)
        expect(parsed.exerciseHints['0']).toBe(2)
      },
      { timeout: 1000 }
    )
  })

  it('should save hint messages', async () => {
    const { result } = renderHook(() => useModuleProgress(moduleId))

    const hintMessage: ExerciseMessage = {
      id: 'hint-1',
      type: 'hint',
      content: 'Test hint',
      timestamp: new Date(),
    }

    act(() => {
      result.current.saveHintMessage(0, hintMessage)
    })

    const messages = result.current.exerciseHintMessages.get(0)
    expect(messages).toHaveLength(1)
    expect(messages![0].content).toBe('Test hint')

    await waitFor(
      () => {
        const saved = localStorage.getItem(storageKey)
        expect(saved).toBeTruthy()
      },
      { timeout: 1000 }
    )
  })

  it('should save feedback messages and replace old ones', async () => {
    const { result } = renderHook(() => useModuleProgress(moduleId))

    const feedbackMessage1: ExerciseMessage = {
      id: 'feedback-1',
      type: 'feedback',
      content: 'First feedback',
      timestamp: new Date(),
      assessment: 'developing',
      attemptNumber: 1,
    }

    const feedbackMessage2: ExerciseMessage = {
      id: 'feedback-2',
      type: 'feedback',
      content: 'Second feedback',
      timestamp: new Date(),
      assessment: 'strong',
      attemptNumber: 2,
    }

    act(() => {
      result.current.saveFeedbackMessage(0, feedbackMessage1)
    })

    expect(result.current.exerciseFeedbackMessages.get(0)).toHaveLength(1)

    act(() => {
      result.current.saveFeedbackMessage(0, feedbackMessage2)
    })

    // Should only keep the latest feedback
    const messages = result.current.exerciseFeedbackMessages.get(0)
    expect(messages).toHaveLength(1)
    expect(messages![0].content).toBe('Second feedback')

    await waitFor(
      () => {
        const saved = localStorage.getItem(storageKey)
        expect(saved).toBeTruthy()
      },
      { timeout: 1000 }
    )
  })

  it('should save assessment', async () => {
    const { result } = renderHook(() => useModuleProgress(moduleId))

    act(() => {
      result.current.saveAssessment(0, 'strong')
    })

    expect(result.current.exerciseAssessments.get(0)).toBe('strong')

    await waitFor(
      () => {
        const saved = localStorage.getItem(storageKey)
        expect(saved).toBeTruthy()
        const parsed = JSON.parse(saved!)
        expect(parsed.exerciseAssessments['0']).toBe('strong')
      },
      { timeout: 1000 }
    )
  })

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem(storageKey, 'invalid json{{{')

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const { result } = renderHook(() => useModuleProgress(moduleId))

    // Should initialize with empty state
    expect(result.current.completedExercises.size).toBe(0)
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should handle array moduleId parameter', () => {
    const { result } = renderHook(() => useModuleProgress(['test-module-123']))

    expect(result.current.isLoading).toBe(false)
    // Should work with array parameter (from useParams)
  })

  it('should debounce multiple rapid updates', async () => {
    const { result } = renderHook(() => useModuleProgress(moduleId))
    const setItemSpy = jest.spyOn(localStorage, 'setItem')

    act(() => {
      result.current.saveHints(0, 1)
      result.current.saveHints(0, 2)
      result.current.saveHints(0, 3)
    })

    // Should not save immediately
    expect(setItemSpy).not.toHaveBeenCalled()

    // Wait for debounce (500ms)
    await waitFor(
      () => {
        expect(setItemSpy).toHaveBeenCalled()
      },
      { timeout: 1000 }
    )

    // Should only save once due to debouncing
    const callCount = setItemSpy.mock.calls.length
    expect(callCount).toBeLessThanOrEqual(2) // Allow for initial + debounced call
  })
})
