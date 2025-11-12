import { formatDuration, calculateTimeDifference } from '@/lib/utils/timeFormat'

describe('timeFormat utilities', () => {
  describe('formatDuration', () => {
    it('formats seconds correctly', () => {
      expect(formatDuration(45)).toBe('45 seconds')
      expect(formatDuration(1)).toBe('1 second')
    })

    it('formats minutes correctly', () => {
      expect(formatDuration(60)).toBe('1 minute')
      expect(formatDuration(120)).toBe('2 minutes')
      expect(formatDuration(90)).toBe('1 minute 30 seconds')
    })

    it('formats hours correctly', () => {
      expect(formatDuration(3600)).toBe('1 hour')
      expect(formatDuration(7200)).toBe('2 hours')
      expect(formatDuration(3660)).toBe('1 hour 1 minute')
      expect(formatDuration(3661)).toBe('1 hour 1 minute')
    })

    it('formats combined hours and minutes', () => {
      expect(formatDuration(5400)).toBe('1 hour 30 minutes')
      expect(formatDuration(7380)).toBe('2 hours 3 minutes')
    })

    it('handles zero duration', () => {
      expect(formatDuration(0)).toBe('0 seconds')
    })

    it('handles negative values by returning absolute value', () => {
      expect(formatDuration(-60)).toBe('1 minute')
    })
  })

  describe('calculateTimeDifference', () => {
    it('calculates difference in seconds between two ISO timestamps', () => {
      const start = '2024-01-01T10:00:00.000Z'
      const end = '2024-01-01T10:05:30.000Z'
      expect(calculateTimeDifference(start, end)).toBe(330) // 5 minutes 30 seconds
    })

    it('handles same timestamp', () => {
      const timestamp = '2024-01-01T10:00:00.000Z'
      expect(calculateTimeDifference(timestamp, timestamp)).toBe(0)
    })

    it('handles timestamps in reverse order', () => {
      const start = '2024-01-01T10:05:00.000Z'
      const end = '2024-01-01T10:00:00.000Z'
      expect(calculateTimeDifference(start, end)).toBe(300) // Returns absolute value
    })

    it('handles timestamps across days', () => {
      const start = '2024-01-01T23:00:00.000Z'
      const end = '2024-01-02T01:00:00.000Z'
      expect(calculateTimeDifference(start, end)).toBe(7200) // 2 hours
    })
  })
})
