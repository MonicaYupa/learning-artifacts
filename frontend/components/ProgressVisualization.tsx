import { formatDuration } from '@/lib/utils/timeFormat'

interface ProgressVisualizationProps {
  exerciseCount: number
  completedCount: number
  aggregateScore: number
  hintsUsed: number
  totalTimeSeconds: number
}

/**
 * StatCard Component - Reusable stat display card
 */
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color?: 'primary' | 'green' | 'yellow' | 'blue'
}

function StatCard({ icon, label, value, color = 'primary' }: StatCardProps) {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600 text-primary-600 bg-primary-50',
    green: 'from-green-500 to-green-600 text-green-600 bg-green-50',
    yellow: 'from-yellow-500 to-yellow-600 text-yellow-600 bg-yellow-50',
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
  }

  return (
    <div
      role="region"
      aria-label={`${label}: ${value}`}
      className="group relative overflow-hidden rounded-xl border border-cream-200 bg-white p-4 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md"
    >
      {/* Icon */}
      <div
        className={`mb-3 inline-flex rounded-lg bg-gradient-to-br p-2.5 shadow-sm ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}
      >
        <div className="h-5 w-5 text-white">{icon}</div>
      </div>

      {/* Label */}
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-600">{label}</p>

      {/* Value */}
      <p className={`text-2xl font-bold ${colorClasses[color].split(' ').slice(2, 3).join(' ')}`}>
        {value}
      </p>
    </div>
  )
}

/**
 * ProgressBar Component - Reusable progress bar
 */
interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
}

function ProgressBar({ value, max = 100, label, showPercentage = true }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const isLow = percentage < 60
  const isMedium = percentage >= 60 && percentage < 80
  const isHigh = percentage >= 80

  const barColor = isLow ? 'bg-yellow-500' : isMedium ? 'bg-blue-500' : 'bg-green-500'

  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-neutral-700">{label}</span>
          {showPercentage && (
            <span className="font-bold text-neutral-900">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label || 'Score progress'}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-3 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner"
      >
        <div
          role="presentation"
          className={`h-full rounded-full shadow-sm transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}

/**
 * ProgressVisualization Component
 * Displays completion statistics in an organized grid layout
 */
export default function ProgressVisualization({
  exerciseCount,
  completedCount,
  aggregateScore,
  hintsUsed,
  totalTimeSeconds,
}: ProgressVisualizationProps) {
  const formattedTime = formatDuration(totalTimeSeconds)

  return (
    <div className="w-full">
      <h2 className="mb-6 text-center text-xl font-bold text-neutral-800 sm:text-2xl">
        Progress Summary
      </h2>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Exercises Completed */}
        <StatCard
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          }
          label="Exercises completed"
          value={`${completedCount}/${exerciseCount}`}
          color="green"
        />

        {/* Aggregate Score */}
        <StatCard
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
          label="Score"
          value={`${aggregateScore}%`}
          color="primary"
        />

        {/* Hints Used */}
        <StatCard
          icon={
            <svg
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          }
          label="Hints used"
          value={hintsUsed}
          color="yellow"
        />

        {/* Time Spent */}
        <StatCard
          icon={
            <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          }
          label="Time spent"
          value={formattedTime}
          color="blue"
        />
      </div>

      {/* Score Progress Bar */}
      <div className="rounded-xl border border-cream-200 bg-white p-5 shadow-sm">
        <ProgressBar value={aggregateScore} label="Overall Performance" />
      </div>
    </div>
  )
}
