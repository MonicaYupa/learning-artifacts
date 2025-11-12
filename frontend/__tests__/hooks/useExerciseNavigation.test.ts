import { renderHook, act } from '@testing-library/react'
import { useExerciseNavigation } from '@/hooks/useExerciseNavigation'
import type { ExerciseMessage } from '@/types/exercise'

describe('useExerciseNavigation', () => {
  const createDefaultProps = (overrides = {}) => ({
    currentExerciseIndex: 0,
    totalExercises: 3,
    completedExercises: new Set<number>(),
    exerciseHints: new Map<number, number>(),
    exerciseHintMessages: new Map<number, ExerciseMessage[]>(),
    exerciseFeedbackMessages: new Map<number, ExerciseMessage[]>(),
    setCurrentExerciseIndex: jest.fn(),
    setHintsUsed: jest.fn(),
    setExerciseMessages: jest.fn(),
    setShowContinueButton: jest.fn(),
    resetExerciseUIState: jest.fn(),
    setShowCompletionModal: jest.fn(),
    completeExercise: jest.fn(),
    ...overrides,
  })

  describe('resetExerciseState', () => {
    it('should reset to current exercise state by default', () => {
      const mockProps = createDefaultProps({
        exerciseHints: new Map([[0, 2]]),
        exerciseHintMessages: new Map([
          [
            0,
            [
              {
                id: 'hint-1',
                type: 'hint' as const,
                content: 'Test hint',
                timestamp: new Date(),
              },
            ],
          ],
        ]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.resetExerciseState()
      })

      expect(mockProps.setHintsUsed).toHaveBeenCalledWith(2)
      expect(mockProps.setExerciseMessages).toHaveBeenCalled()
      expect(mockProps.resetExerciseUIState).toHaveBeenCalled()
    })

    it('should reset to specific exercise index', () => {
      const mockProps = createDefaultProps({
        exerciseHints: new Map([
          [0, 1],
          [1, 3],
        ]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.resetExerciseState(1)
      })

      expect(mockProps.setHintsUsed).toHaveBeenCalledWith(3)
    })

    it('should combine hint and feedback messages sorted by timestamp', () => {
      const hintMsg: ExerciseMessage = {
        id: 'hint-1',
        type: 'hint',
        content: 'Hint',
        timestamp: new Date('2024-01-01T10:00:00'),
      }

      const feedbackMsg: ExerciseMessage = {
        id: 'feedback-1',
        type: 'feedback',
        content: 'Feedback',
        timestamp: new Date('2024-01-01T10:05:00'),
        assessment: 'strong',
        attemptNumber: 1,
      }

      const mockProps = createDefaultProps({
        exerciseHintMessages: new Map([[0, [hintMsg]]]),
        exerciseFeedbackMessages: new Map([[0, [feedbackMsg]]]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.resetExerciseState(0)
      })

      // Should combine and sort messages
      expect(mockProps.setExerciseMessages).toHaveBeenCalledWith([hintMsg, feedbackMsg])
    })

    it('should show continue button if feedback exists', () => {
      const feedbackMsg: ExerciseMessage = {
        id: 'feedback-1',
        type: 'feedback',
        content: 'Feedback',
        timestamp: new Date(),
        assessment: 'strong',
        attemptNumber: 1,
      }

      const mockProps = createDefaultProps({
        exerciseFeedbackMessages: new Map([[0, [feedbackMsg]]]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.resetExerciseState(0)
      })

      expect(mockProps.setShowContinueButton).toHaveBeenCalledWith(true)
    })

    it('should not show continue button if no feedback', () => {
      const mockProps = createDefaultProps()

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.resetExerciseState(0)
      })

      expect(mockProps.setShowContinueButton).toHaveBeenCalledWith(false)
    })
  })

  describe('advanceToNextExercise', () => {
    it('should complete current exercise and move to next', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 0,
        totalExercises: 3,
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.advanceToNextExercise()
      })

      expect(mockProps.completeExercise).toHaveBeenCalledWith(0)
      expect(mockProps.setCurrentExerciseIndex).toHaveBeenCalledWith(1)
    })

    it('should show completion modal on last exercise', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 2,
        totalExercises: 3,
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.advanceToNextExercise()
      })

      expect(mockProps.completeExercise).toHaveBeenCalledWith(2)
      expect(mockProps.setShowCompletionModal).toHaveBeenCalledWith(true)
      expect(mockProps.setCurrentExerciseIndex).not.toHaveBeenCalled()
    })

    it('should reset state when advancing to next exercise', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 0,
        totalExercises: 3,
        exerciseHints: new Map([[1, 1]]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.advanceToNextExercise()
      })

      // Should reset state for the next exercise (index 1)
      expect(mockProps.setHintsUsed).toHaveBeenCalledWith(1)
      expect(mockProps.resetExerciseUIState).toHaveBeenCalled()
    })
  })

  describe('navigateToExercise', () => {
    it('should navigate to completed exercise', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 1,
        completedExercises: new Set([0]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.navigateToExercise(0)
      })

      expect(mockProps.setCurrentExerciseIndex).toHaveBeenCalledWith(0)
    })

    it('should navigate to current exercise', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 1,
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.navigateToExercise(1)
      })

      expect(mockProps.setCurrentExerciseIndex).toHaveBeenCalledWith(1)
    })

    it('should navigate to next exercise if previous is completed', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 0,
        completedExercises: new Set([0]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.navigateToExercise(1)
      })

      expect(mockProps.setCurrentExerciseIndex).toHaveBeenCalledWith(1)
    })

    it('should not navigate to locked exercise', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 0,
        completedExercises: new Set(),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.navigateToExercise(2)
      })

      // Should not navigate to exercise 2 (locked)
      expect(mockProps.setCurrentExerciseIndex).not.toHaveBeenCalled()
    })

    it('should reset state when navigating', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 0,
        completedExercises: new Set([0, 1]),
        exerciseHints: new Map([[1, 2]]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      act(() => {
        result.current.navigateToExercise(1)
      })

      expect(mockProps.setCurrentExerciseIndex).toHaveBeenCalledWith(1)
      expect(mockProps.setHintsUsed).toHaveBeenCalledWith(2)
      expect(mockProps.resetExerciseUIState).toHaveBeenCalled()
    })
  })

  describe('isExerciseUnlocked', () => {
    it('should return true for completed exercise', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 2,
        completedExercises: new Set([0, 1]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      expect(result.current.isExerciseUnlocked(0)).toBe(true)
      expect(result.current.isExerciseUnlocked(1)).toBe(true)
    })

    it('should return true for current exercise', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 1,
        completedExercises: new Set([0]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      expect(result.current.isExerciseUnlocked(1)).toBe(true)
    })

    it('should return true for next exercise after completing previous', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 1,
        completedExercises: new Set([0]),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      expect(result.current.isExerciseUnlocked(1)).toBe(true)
    })

    it('should return false for locked exercise', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 0,
        completedExercises: new Set(),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      expect(result.current.isExerciseUnlocked(2)).toBe(false)
    })

    it('should handle first exercise (index 0) correctly', () => {
      const mockProps = createDefaultProps({
        currentExerciseIndex: 0,
        completedExercises: new Set(),
      })

      const { result } = renderHook(() => useExerciseNavigation(mockProps))

      // First exercise should always be unlocked (current)
      expect(result.current.isExerciseUnlocked(0)).toBe(true)
    })
  })
})
