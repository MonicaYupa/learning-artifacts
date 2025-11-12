import { ReactNode } from 'react'
import { ModuleContext, ModuleContextValue } from '@/contexts/ModuleContext'
import type { Exercise, ExerciseMessage } from '@/types/exercise'

/**
 * Default mock context value for testing
 */
export const createMockContextValue = (
  overrides?: Partial<ModuleContextValue>
): ModuleContextValue => {
  const mockExercise: Exercise = {
    id: 'ex-1',
    name: 'Test Exercise',
    type: 'analysis',
    prompt: 'Test prompt',
    material: 'Test material',
    hints: ['Hint 1', 'Hint 2', 'Hint 3'],
  }

  return {
    // Module data
    sessionId: 'test-session-123',
    exercises: [mockExercise],
    currentExercise: mockExercise,
    currentExerciseIndex: 0,
    totalExercises: 1,

    // Exercise state
    hintsUsed: 0,
    maxHints: 3,
    exerciseMessages: [],
    collapsedHints: new Set(),
    showCelebration: false,
    showContinueButton: false,
    justUnlockedExercise: null,
    activeTab: 'exercise',

    // Progress state
    completedExercises: new Set(),
    exerciseResponses: new Map(),
    exerciseAssessments: new Map(),

    // Actions (mock functions)
    handleHintReceived: jest.fn(),
    handleSubmitSuccess: jest.fn(),
    toggleHintCollapse: jest.fn(),
    advanceToNextExercise: jest.fn(),
    handleCompleteModule: jest.fn(),
    navigateToExercise: jest.fn(),
    setActiveTab: jest.fn(),

    // Apply any overrides
    ...overrides,
  }
}

/**
 * Mock Module Context Provider for testing
 */
export function MockModuleProvider({
  children,
  value,
}: {
  children: ReactNode
  value?: Partial<ModuleContextValue>
}) {
  const contextValue = createMockContextValue(value)

  return <ModuleContext.Provider value={contextValue}>{children}</ModuleContext.Provider>
}

/**
 * Helper to create multiple exercises for testing
 */
export const createMockExercises = (count: number): Exercise[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `ex-${i + 1}`,
    name: `Exercise ${i + 1}`,
    type: 'analysis' as const,
    prompt: `Test prompt ${i + 1}`,
    material: `Test material ${i + 1}`,
    hints: [`Hint 1`, `Hint 2`, `Hint 3`],
  }))
}

/**
 * Helper to create mock exercise messages
 */
export const createMockMessages = (types: ('hint' | 'feedback')[]): ExerciseMessage[] => {
  return types.map((type, i) => {
    if (type === 'hint') {
      return {
        id: `${type}-${i + 1}`,
        type: 'hint' as const,
        content: `Test ${type} content`,
        timestamp: new Date(),
      }
    } else {
      return {
        id: `${type}-${i + 1}`,
        type: 'feedback' as const,
        content: `Test ${type} content`,
        timestamp: new Date(),
        assessment: 'strong' as const,
        attemptNumber: 1,
        modelAnswer: 'Test model answer',
      }
    }
  })
}
