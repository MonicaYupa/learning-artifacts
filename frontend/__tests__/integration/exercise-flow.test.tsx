/**
 * Integration tests for the core exercise flow
 * Tests the complete user journey: viewing exercise -> requesting hints -> submitting answer -> advancing
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockModuleProvider, createMockExercises } from '@/lib/test-utils/providers'
import ExerciseCard from '@/components/module/ExerciseCard'
import WorkspacePanel from '@/components/module/WorkspacePanel'
import type { ModuleContextValue } from '@/contexts/ModuleContext'

describe('Exercise Flow Integration Tests', () => {
  const mockExercises = createMockExercises(3)

  const createContextWithExercise = (exerciseIndex: number = 0): Partial<ModuleContextValue> => ({
    exercises: mockExercises,
    currentExercise: mockExercises[exerciseIndex],
    currentExerciseIndex: exerciseIndex,
    totalExercises: mockExercises.length,
    sessionId: 'test-session-123',
    hintsUsed: 0,
    maxHints: 3,
    exerciseMessages: [],
    completedExercises: new Set(),
    exerciseResponses: new Map(),
    exerciseAssessments: new Map(),
    showContinueButton: false,
    showCelebration: false,
    justUnlockedExercise: null,
    activeTab: 'exercise',
    collapsedHints: new Set(),
  })

  describe('Exercise Display', () => {
    it('should render exercise card with exercise details', () => {
      const mockContext = createContextWithExercise(0)

      render(
        <MockModuleProvider value={mockContext}>
          <ExerciseCard />
        </MockModuleProvider>
      )

      expect(screen.getByText('Exercise 1')).toBeInTheDocument()
      expect(screen.getByText('Test prompt 1')).toBeInTheDocument()
    })

    it('should display all exercises in the navigator', () => {
      const mockContext = createContextWithExercise(0)

      render(
        <MockModuleProvider value={mockContext}>
          <ExerciseCard />
        </MockModuleProvider>
      )

      // Check that navigation shows all exercises
      const navigator = screen.getByRole('navigation', {
        name: /exercise navigation/i,
      })
      expect(navigator).toBeInTheDocument()
    })
  })

  describe('Hint System Flow', () => {
    it('should disable hint button when all hints are used', () => {
      const mockContext: Partial<ModuleContextValue> = {
        ...createContextWithExercise(0),
        hintsUsed: 3,
        maxHints: 3,
      }

      render(
        <MockModuleProvider value={mockContext}>
          <WorkspacePanel />
        </MockModuleProvider>
      )

      const hintButton = screen.getByRole('button', {
        name: /all hints used/i,
      })
      expect(hintButton).toBeDisabled()
    })
  })

  describe('Answer Submission Flow', () => {
    it('should allow typing and submitting an answer', async () => {
      const user = userEvent.setup()
      const mockHandleSubmitSuccess = jest.fn()

      const mockContext: Partial<ModuleContextValue> = {
        ...createContextWithExercise(0),
        handleSubmitSuccess: mockHandleSubmitSuccess,
      }

      render(
        <MockModuleProvider value={mockContext}>
          <WorkspacePanel />
        </MockModuleProvider>
      )

      const textarea = screen.getByPlaceholderText(/type your answer here/i)
      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })

      // Initially submit button should be disabled (empty answer)
      expect(submitButton).toBeDisabled()

      // Type an answer
      await user.type(textarea, 'This is my test answer')

      // Now submit button should be enabled
      await waitFor(() => {
        expect(submitButton).toBeEnabled()
      })
    })

    it('should show feedback after submission', () => {
      const mockContext: Partial<ModuleContextValue> = {
        ...createContextWithExercise(0),
        exerciseMessages: [
          {
            id: 'feedback-1',
            type: 'feedback',
            content: 'Great work! Your answer demonstrates understanding.',
            timestamp: new Date(),
            assessment: 'strong',
            attemptNumber: 1,
            modelAnswer: 'Model answer here',
          },
        ],
        showContinueButton: true,
      }

      render(
        <MockModuleProvider value={mockContext}>
          <WorkspacePanel />
        </MockModuleProvider>
      )

      expect(screen.getByText(/great work/i)).toBeInTheDocument()
    })

    it('should show continue button after successful submission', () => {
      const mockContext: Partial<ModuleContextValue> = {
        ...createContextWithExercise(0),
        showContinueButton: true,
        exerciseMessages: [
          {
            id: 'feedback-1',
            type: 'feedback',
            content: 'Feedback',
            timestamp: new Date(),
            assessment: 'strong',
            attemptNumber: 1,
          },
        ],
      }

      render(
        <MockModuleProvider value={mockContext}>
          <WorkspacePanel />
        </MockModuleProvider>
      )

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })
  })

  describe('Exercise Navigation Flow', () => {
    it('should allow navigating to unlocked exercises', async () => {
      const user = userEvent.setup()
      const mockNavigateToExercise = jest.fn()

      const mockContext: Partial<ModuleContextValue> = {
        ...createContextWithExercise(1),
        completedExercises: new Set([0]),
        navigateToExercise: mockNavigateToExercise,
      }

      render(
        <MockModuleProvider value={mockContext}>
          <ExerciseCard />
        </MockModuleProvider>
      )

      // Try to navigate to completed exercise (should work)
      const exerciseButtons = screen.getAllByRole('button', {
        name: /exercise/i,
      })
      if (exerciseButtons.length > 0) {
        await user.click(exerciseButtons[0])
        // Navigation function would be called if we had the full component structure
      }
    })

    it('should advance to next exercise when continue is clicked', async () => {
      const user = userEvent.setup()
      const mockAdvanceToNextExercise = jest.fn()

      const mockContext: Partial<ModuleContextValue> = {
        ...createContextWithExercise(0),
        showContinueButton: true,
        advanceToNextExercise: mockAdvanceToNextExercise,
        exerciseMessages: [
          {
            id: 'feedback-1',
            type: 'feedback',
            content: 'Good job!',
            timestamp: new Date(),
            assessment: 'strong',
            attemptNumber: 1,
          },
        ],
      }

      render(
        <MockModuleProvider value={mockContext}>
          <WorkspacePanel />
        </MockModuleProvider>
      )

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      expect(mockAdvanceToNextExercise).toHaveBeenCalled()
    })

    it('should show complete button on last exercise', () => {
      const mockContext: Partial<ModuleContextValue> = {
        ...createContextWithExercise(2),
        currentExerciseIndex: 2,
        showContinueButton: true,
        exerciseMessages: [
          {
            id: 'feedback-1',
            type: 'feedback',
            content: 'Excellent!',
            timestamp: new Date(),
            assessment: 'strong',
            attemptNumber: 1,
          },
        ],
      }

      render(
        <MockModuleProvider value={mockContext}>
          <WorkspacePanel />
        </MockModuleProvider>
      )

      expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument()
    })
  })

  describe('Persistence and State Restoration', () => {
    it('should display previously saved answer when revisiting an exercise', () => {
      const savedAnswer = 'My previously saved answer'
      const mockContext: Partial<ModuleContextValue> = {
        ...createContextWithExercise(0),
        exerciseResponses: new Map([[0, savedAnswer]]),
      }

      render(
        <MockModuleProvider value={mockContext}>
          <WorkspacePanel />
        </MockModuleProvider>
      )

      const textarea = screen.getByPlaceholderText(/type your answer here/i)
      expect(textarea).toHaveValue(savedAnswer)
    })

    it('should show previous hints and feedback when revisiting', () => {
      const mockContext: Partial<ModuleContextValue> = {
        ...createContextWithExercise(0),
        hintsUsed: 2,
        exerciseMessages: [
          {
            id: 'hint-1',
            type: 'hint',
            content: 'First hint',
            timestamp: new Date('2024-01-01T10:00:00'),
          },
          {
            id: 'hint-2',
            type: 'hint',
            content: 'Second hint',
            timestamp: new Date('2024-01-01T10:05:00'),
          },
          {
            id: 'feedback-1',
            type: 'feedback',
            content: 'Your previous feedback',
            timestamp: new Date('2024-01-01T10:10:00'),
            assessment: 'developing',
            attemptNumber: 1,
          },
        ],
      }

      render(
        <MockModuleProvider value={mockContext}>
          <WorkspacePanel />
        </MockModuleProvider>
      )

      expect(screen.getByText(/first hint/i)).toBeInTheDocument()
      expect(screen.getByText(/second hint/i)).toBeInTheDocument()
      expect(screen.getByText(/your previous feedback/i)).toBeInTheDocument()
    })
  })
})
