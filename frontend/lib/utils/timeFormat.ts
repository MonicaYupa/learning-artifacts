/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "5 minutes 30 seconds", "1 hour 15 minutes")
 */
export function formatDuration(seconds: number): string {
  const absSeconds = Math.abs(seconds)

  if (absSeconds === 0) {
    return '0 seconds'
  }

  const hours = Math.floor(absSeconds / 3600)
  const minutes = Math.floor((absSeconds % 3600) / 60)
  const secs = Math.floor(absSeconds % 60)

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  }

  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
  }

  // Only show seconds if there are no hours
  if (secs > 0 && hours === 0) {
    parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`)
  }

  return parts.join(' ')
}

/**
 * Calculate time difference in seconds between two ISO timestamps
 * @param start - Start timestamp (ISO string)
 * @param end - End timestamp (ISO string)
 * @returns Absolute difference in seconds
 */
export function calculateTimeDifference(start: string, end: string): number {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  return Math.abs(Math.floor((endTime - startTime) / 1000))
}
