import { renderHook, act } from '@testing-library/react'
import { useExerciseState } from '@/hooks/useExerciseState'
import { DEFAULT_ATTEMPT_NUMBER } from '@/lib/constants/module'

describe('useExerciseState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useExerciseState())

    expect(result.current.currentAttemptNumber).toBe(DEFAULT_ATTEMPT_NUMBER)
    expect(result.current.hintsUsed).toBe(0)
    expect(result.current.exerciseMessages).toEqual([])
    expect(result.current.activeTab).toBe('exercise')
    expect(result.current.collapsedHints.size).toBe(0)
    expect(result.current.showContinueButton).toBe(false)
    expect(result.current.showCelebration).toBe(false)
    expect(result.current.justUnlockedExercise).toBe(null)
    expect(result.current.showCompletionModal).toBe(false)
  })

  it('should toggle hint collapse', () => {
    const { result } = renderHook(() => useExerciseState())

    act(() => {
      result.current.toggleHintCollapse('hint-1')
    })

    expect(result.current.collapsedHints.has('hint-1')).toBe(true)

    act(() => {
      result.current.toggleHintCollapse('hint-1')
    })

    expect(result.current.collapsedHints.has('hint-1')).toBe(false)
  })

  it('should reset exercise UI state', () => {
    const { result } = renderHook(() => useExerciseState())

    // Set some values
    act(() => {
      result.current.setCurrentAttemptNumber(3)
      result.current.setShowCelebration(true)
      result.current.setJustUnlockedExercise(2)
      result.current.toggleHintCollapse('hint-1')
    })

    // Reset
    act(() => {
      result.current.resetExerciseUIState()
    })

    expect(result.current.currentAttemptNumber).toBe(DEFAULT_ATTEMPT_NUMBER)
    expect(result.current.showCelebration).toBe(false)
    expect(result.current.justUnlockedExercise).toBe(null)
    expect(result.current.collapsedHints.size).toBe(0)
  })

  it('should update hints used', () => {
    const { result } = renderHook(() => useExerciseState())

    act(() => {
      result.current.setHintsUsed(2)
    })

    expect(result.current.hintsUsed).toBe(2)
  })

  it('should update exercise messages', () => {
    const { result } = renderHook(() => useExerciseState())

    const messages = [
      {
        id: 'msg-1',
        type: 'hint' as const,
        content: 'Test hint',
        timestamp: new Date(),
      },
    ]

    act(() => {
      result.current.setExerciseMessages(messages)
    })

    expect(result.current.exerciseMessages).toEqual(messages)
  })

  it('should switch active tab', () => {
    const { result } = renderHook(() => useExerciseState())

    expect(result.current.activeTab).toBe('exercise')

    act(() => {
      result.current.setActiveTab('editor')
    })

    expect(result.current.activeTab).toBe('editor')
  })
})
