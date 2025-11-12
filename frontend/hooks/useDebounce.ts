import { useEffect, useState } from 'react'

/**
 * Custom hook to debounce a value
 * Returns the debounced value after the specified delay
 *
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearchTerm = useDebounce(searchTerm, 500)
 *
 * useEffect(() => {
 *   // This will only run 500ms after the user stops typing
 *   fetchResults(debouncedSearchTerm)
 * }, [debouncedSearchTerm])
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up the timeout if value changes before delay expires
    // This is the debouncing mechanism
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for debouncing effects
 * Useful when you want to debounce side effects instead of values
 *
 * @param callback - The effect callback to debounce
 * @param delay - The debounce delay in milliseconds
 * @param deps - Dependencies array (similar to useEffect)
 *
 * @example
 * ```tsx
 * useDebouncedEffect(() => {
 *   // This will only run 500ms after deps stop changing
 *   localStorage.setItem('key', value)
 * }, 500, [value])
 * ```
 */
export function useDebouncedEffect(
  callback: () => void,
  delay: number,
  deps: React.DependencyList
): void {
  useEffect(() => {
    const handler = setTimeout(() => {
      callback()
    }, delay)

    return () => {
      clearTimeout(handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
