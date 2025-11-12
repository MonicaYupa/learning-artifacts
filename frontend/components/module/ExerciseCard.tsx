import { memo, useCallback } from 'react'
import AnalysisExercise from '@/components/exercises/AnalysisExercise'
import ComparativeExercise from '@/components/exercises/ComparativeExercise'
import FrameworkExercise from '@/components/exercises/FrameworkExercise'
import ExerciseProgressNavigator from '@/components/ExerciseProgressNavigator'
import { UI_MESSAGES } from '@/lib/constants/module'
import { useModuleContext } from '@/contexts/ModuleContext'
import type { Exercise } from '@/types/exercise'

/**
 * Exercise card component - displays the current exercise
 * and the progress navigator
 */
function ExerciseCard() {
  const {
    exercises,
    currentExercise: exercise,
    currentExerciseIndex: exerciseIndex,
    completedExercises,
    exerciseAssessments,
    justUnlockedExercise,
    activeTab,
    navigateToExercise,
  } = useModuleContext()
  const renderExercise = useCallback((ex: Exercise) => {
    return (
      <div className="space-y-4 sm:space-y-5">
        {ex.type === 'analysis' && ex.material && (
          <AnalysisExercise prompt={ex.prompt} material={ex.material} />
        )}

        {ex.type === 'comparative' && ex.options && (
          <ComparativeExercise prompt={ex.prompt} options={ex.options} />
        )}

        {ex.type === 'framework' && (
          <FrameworkExercise prompt={ex.prompt} scaffold={ex.scaffold} material={ex.material} />
        )}
      </div>
    )
  }, [])

  return (
    <div
      id="exercise-panel"
      role="tabpanel"
      aria-labelledby="exercise-tab"
      className={`bg-dark flex w-full flex-col p-4 sm:w-2/5 sm:p-6 lg:p-8 ${activeTab === 'exercise' ? 'block' : 'hidden sm:flex'}`}
    >
      {exercise && (
        <div className="animate-fadeInUp mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-cream-200/80 bg-cream-50 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35),0_15px_30px_-10px_rgba(0,0,0,0.25),0_0_0_1px_rgba(217,119,87,0.05)] transition-shadow duration-300 hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.4),0_20px_40px_-10px_rgba(0,0,0,0.3),0_0_0_1px_rgba(217,119,87,0.1)]">
          {/* Card Header */}
          <div className="frosted-glass flex-shrink-0 bg-gradient-to-b from-cream-100/70 via-cream-50/40 to-transparent px-5 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4 lg:px-8 lg:pt-8 lg:pb-4">
            {/* Exercise Name */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl lg:text-3xl">
                {exercise.name || `Exercise ${exerciseIndex + 1}`}
              </h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="smooth-scroll relative flex-1 overflow-y-auto">
            <div className="space-y-4 px-5 pt-3 pb-5 sm:space-y-5 sm:px-6 sm:pt-4 sm:pb-6 lg:px-8 lg:pt-4 lg:pb-8">
              {/* Current Exercise */}
              <div className="space-y-4">{renderExercise(exercise)}</div>

              {!exercise && (
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
                      <p className="text-sm font-medium text-neutral-800">{UI_MESSAGES.loading}</p>
                      <p className="mt-1 text-sm text-neutral-600">{UI_MESSAGES.noExercises}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Progress Navigator - At bottom of card */}
          <ExerciseProgressNavigator
            exercises={exercises}
            currentExerciseIndex={exerciseIndex}
            completedExercises={completedExercises}
            exerciseAssessments={exerciseAssessments}
            justUnlockedExercise={justUnlockedExercise}
            onNavigate={navigateToExercise}
          />
        </div>
      )}
    </div>
  )
}

export default memo(ExerciseCard)
