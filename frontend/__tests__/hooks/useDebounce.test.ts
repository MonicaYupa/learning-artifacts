import { renderHook, act } from '@testing-library/react'
import { useDebounce, useDebouncedEffect } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: 'initial' },
    })

    // Initial value should be set
    expect(result.current).toBe('initial')

    // Change value
    rerender({ value: 'updated' })

    // Value should still be initial (not yet debounced)
    expect(result.current).toBe('initial')

    // Fast-forward time by 499ms (just before debounce delay)
    act(() => {
      jest.advanceTimersByTime(499)
    })
    expect(result.current).toBe('initial')

    // Fast-forward time by 1ms (total 500ms - debounce delay complete)
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('should cancel previous debounce on rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: 'first' },
    })

    expect(result.current).toBe('first')

    // Rapid changes
    rerender({ value: 'second' })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    rerender({ value: 'third' })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    rerender({ value: 'fourth' })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Should still be 'first' because we haven't waited 500ms since last change
    expect(result.current).toBe('first')

    // Fast-forward remaining 300ms (total 500ms since 'fourth')
    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Should now be 'fourth' (last value)
    expect(result.current).toBe('fourth')
  })

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 1000), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    // Should not update at 500ms
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')

    // Should update at 1000ms
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe('updated')
  })
})

describe('useDebouncedEffect', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should debounce effect execution', () => {
    const callback = jest.fn()
    const { rerender } = renderHook(({ value }) => useDebouncedEffect(callback, 500, [value]), {
      initialProps: { value: 'initial' },
    })

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled()

    // Fast-forward time
    jest.advanceTimersByTime(500)

    // Callback should be called after delay
    expect(callback).toHaveBeenCalledTimes(1)

    // Change dependency
    rerender({ value: 'updated' })

    // Callback should not be called immediately
    expect(callback).toHaveBeenCalledTimes(1)

    // Fast-forward time
    jest.advanceTimersByTime(500)

    // Callback should be called again
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('should cancel previous effect on rapid dependency changes', () => {
    const callback = jest.fn()
    const { rerender } = renderHook(({ value }) => useDebouncedEffect(callback, 500, [value]), {
      initialProps: { value: 1 },
    })

    // Rapid changes - rerender before timeout completes
    rerender({ value: 2 })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    rerender({ value: 3 })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    rerender({ value: 4 })
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Callback should not be called yet (we keep canceling the timer)
    expect(callback).not.toHaveBeenCalled()

    // Fast-forward full 500ms since last rerender (value: 4)
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Callback should be called only once (for the last value)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should cleanup timeout on unmount', () => {
    const callback = jest.fn()
    const { unmount } = renderHook(({ value }) => useDebouncedEffect(callback, 500, [value]), {
      initialProps: { value: 'test' },
    })

    // Unmount before timeout completes
    jest.advanceTimersByTime(200)
    unmount()

    // Fast-forward remaining time
    jest.advanceTimersByTime(300)

    // Callback should not be called
    expect(callback).not.toHaveBeenCalled()
  })
})

describe('useDebounce with localStorage simulation', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    Storage.prototype.setItem = jest.fn()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('should batch multiple localStorage writes with debounced effect', () => {
    const mockSetItem = jest.fn()
    Storage.prototype.setItem = mockSetItem

    const { rerender } = renderHook(
      ({ data }) =>
        useDebouncedEffect(
          () => {
            localStorage.setItem('test-key', JSON.stringify(data))
          },
          500,
          [data]
        ),
      {
        initialProps: { data: { count: 0 } },
      }
    )

    // Simulate rapid state changes (like multiple hints being requested)
    rerender({ data: { count: 1 } })
    jest.advanceTimersByTime(100)

    rerender({ data: { count: 2 } })
    jest.advanceTimersByTime(100)

    rerender({ data: { count: 3 } })
    jest.advanceTimersByTime(100)

    rerender({ data: { count: 4 } })
    jest.advanceTimersByTime(100)

    rerender({ data: { count: 5 } })

    // localStorage.setItem should not be called yet (we're batching writes)
    expect(mockSetItem).not.toHaveBeenCalled()

    // Fast-forward to complete debounce
    jest.advanceTimersByTime(500)

    // localStorage.setItem should be called only ONCE with the final value
    expect(mockSetItem).toHaveBeenCalledTimes(1)
    expect(mockSetItem).toHaveBeenCalledWith('test-key', JSON.stringify({ count: 5 }))
  })
})
