import type { Exercise } from '@/types/exercise'

interface ExerciseProgressNavigatorProps {
  exercises: Exercise[]
  currentExerciseIndex: number
  completedExercises: Set<number>
  exerciseAssessments: Map<number, 'strong' | 'developing' | 'needs_support'>
  justUnlockedExercise: number | null
  onNavigate: (index: number) => void
}

export default function ExerciseProgressNavigator({
  exercises,
  currentExerciseIndex,
  completedExercises,
  exerciseAssessments,
  justUnlockedExercise,
  onNavigate,
}: ExerciseProgressNavigatorProps) {
  if (!exercises || exercises.length === 0) {
    return null
  }

  return (
    <div className="flex-shrink-0 bg-gradient-to-b from-cream-100/60 to-cream-200/40 px-5 py-4 sm:px-6 sm:py-4 lg:px-8">
      {/* Interactive Exercise Dots */}
      <div
        className="flex items-center justify-center gap-3"
        role="navigation"
        aria-label="Exercise navigation"
      >
        {exercises.map((exercise, index) => {
          const isCompleted = completedExercises.has(index)
          const isCurrent = index === currentExerciseIndex
          // Unlock if completed, current, or if previous exercise is completed
          const isPreviousCompleted = index > 0 && completedExercises.has(index - 1)
          const isUnlocked = isCompleted || isCurrent || isPreviousCompleted
          const isJustUnlocked = justUnlockedExercise === index
          const assessment = exerciseAssessments.get(index)
          const hasAttempted = assessment !== undefined

          // Determine button styling based on state and assessment
          const getButtonStyles = () => {
            if (isCurrent) {
              // Current exercise: keep primary orange styling with a subtle ring
              return 'border-primary-500 bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg scale-110 ring-2 ring-primary-300 ring-offset-2'
            } else if (hasAttempted) {
              // Has been attempted: color based on assessment
              if (assessment === 'strong') {
                return 'border-green-400 bg-gradient-to-br from-green-100 to-green-50 text-green-700 hover:scale-105 hover:border-green-500 hover:shadow-md cursor-pointer'
              } else if (assessment === 'developing') {
                return 'border-yellow-400 bg-gradient-to-br from-yellow-100 to-yellow-50 text-yellow-700 hover:scale-105 hover:border-yellow-500 hover:shadow-md cursor-pointer'
              } else if (assessment === 'needs_support') {
                return 'border-primary-400 bg-gradient-to-br from-primary-100 to-primary-50 text-primary-700 hover:scale-105 hover:border-primary-500 hover:shadow-md cursor-pointer'
              }
            } else if (isUnlocked) {
              // Unlocked but not attempted
              return 'border-neutral-400 bg-gradient-to-br from-neutral-50 to-cream-100 text-neutral-700 hover:scale-105 hover:border-primary-400 hover:shadow-md cursor-pointer'
            }
            // Locked
            return 'border-cream-300 bg-cream-200 text-neutral-400 cursor-not-allowed opacity-50'
          }

          return (
            <button
              key={`${exercise.id}-${index}`}
              onClick={() => onNavigate(index)}
              disabled={!isUnlocked}
              aria-label={`${isUnlocked ? 'Go to' : 'Locked'} exercise ${index + 1}${isCurrent ? ' (current)' : ''}${isCompleted ? ' (completed)' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold text-xs transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-cream-100 ${getButtonStyles()} ${isJustUnlocked ? 'animate-pulse-glow animate-scaleIn' : ''}`}
            >
              {isCompleted && !isCurrent ? (
                // Checkmark for completed exercises
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                // Exercise number
                <span>{index + 1}</span>
              )}

              {/* Tooltip on hover */}
              {isUnlocked && (
                <div className="pointer-events-none absolute bottom-full mb-2 hidden whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
                  Exercise {index + 1}: {exercise.name}
                  {isCurrent && <span className="ml-1">(Current)</span>}
                  {isCompleted && !isCurrent && <span className="ml-1">✓</span>}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900"></div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
