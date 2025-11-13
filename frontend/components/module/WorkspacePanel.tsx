import { memo, useRef } from 'react'
import AnswerSubmission from '@/components/AnswerSubmission'
import HintSystem from '@/components/HintSystem'
import FeedbackDisplay from '@/components/FeedbackDisplay'
import CelebrationConfetti from '@/components/CelebrationConfetti'
import { useModuleContext } from '@/contexts/ModuleContext'

/**
 * Workspace panel component
 * Contains answer submission, hints, feedback, and action buttons
 */
function WorkspacePanel() {
  const {
    sessionId,
    hintsUsed,
    maxHints,
    exerciseMessages,
    collapsedHints,
    showCelebration,
    showContinueButton,
    currentExerciseIndex,
    totalExercises,
    exerciseResponses,
    completedExercises,
    activeTab,
    handleHintReceived,
    handleSubmitSuccess,
    handleStreamingUpdate,
    toggleHintCollapse,
    advanceToNextExercise,
    handleCompleteModule,
  } = useModuleContext()

  const editorPanelRef = useRef<HTMLDivElement>(null)

  const isLastExercise = currentExerciseIndex >= totalExercises - 1
  const initialAnswer = exerciseResponses.get(currentExerciseIndex) || ''
  const hasBeenSubmitted =
    showContinueButton ||
    exerciseResponses.has(currentExerciseIndex) ||
    completedExercises.has(currentExerciseIndex)

  return (
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
            key={`exercise-${currentExerciseIndex}`}
            sessionId={sessionId}
            exerciseIndex={currentExerciseIndex}
            hintsUsed={hintsUsed}
            onSubmitSuccess={handleSubmitSuccess}
            onStreamingUpdate={handleStreamingUpdate}
            initialAnswer={initialAnswer}
            renderFeedback={() => (
              <>
                {exerciseMessages.length > 0 && (
                  <div className="relative mb-4 space-y-3 sm:mb-6">
                    {/* Celebration Animation Overlay - appears over feedback */}
                    <CelebrationConfetti show={showCelebration} />

                    {exerciseMessages.map((message) => (
                      <div key={message.id}>
                        {message.type === 'feedback' && (
                          <div className="ring-2 ring-primary-400/20 rounded-lg">
                            <FeedbackDisplay
                              assessment={message.assessment}
                              feedback={message.content}
                              attemptNumber={message.attemptNumber}
                              isStreaming={message.isStreaming}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            renderSubmitButton={(submitProps) => (
              <div className="flex flex-col gap-3">
                {/* Button Row */}
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
                        disabled={hintProps.disabled}
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

                  {/* Submit and Continue buttons grouped on the right */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
                    {/* Submit Button */}
                    <button
                      onClick={submitProps.onClick}
                      disabled={submitProps.disabled}
                      aria-label={`${hasBeenSubmitted ? 'Resubmit' : 'Submit'} answer ${submitProps.isSubmitting ? '(submitting...)' : ''}`}
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
                            <span>{hasBeenSubmitted ? 'Resubmit' : 'Submit'}</span>
                          </>
                        )}
                      </span>
                    </button>

                    {/* Continue Button - Shows after first submission */}
                    {showContinueButton && (
                      <button
                        onClick={() => {
                          if (isLastExercise) {
                            handleCompleteModule()
                          } else {
                            advanceToNextExercise()
                          }
                        }}
                        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow-md active:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-neutral-800 sm:w-auto sm:px-6"
                      >
                        <span className="flex items-center justify-center gap-2">
                          {isLastExercise ? (
                            <>
                              <span>Complete</span>
                              <svg
                                className="h-4 w-4"
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
                            </>
                          ) : (
                            <>
                              <span>Continue</span>
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                              </svg>
                            </>
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* Hints Display - Below answer submission */}
        {exerciseMessages.some((msg) => msg.type === 'hint') && (
          <div className="mb-3 space-y-3 sm:mb-4">
            {exerciseMessages.map(
              (message) =>
                message.type === 'hint' && (
                  <div key={message.id}>
                    <div
                      className="rounded-lg border border-primary-500/30 bg-neutral-800 focus-within:ring-2 focus-within:ring-primary-500/50"
                      role="region"
                      aria-label="Hint message"
                    >
                      <button
                        onClick={() => toggleHintCollapse(message.id)}
                        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-neutral-750 focus:outline-none"
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
      </div>
    </div>
  )
}

export default memo(WorkspacePanel)
