import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import type { HintResponse, SubmitResponse, ApiError } from '@/types/session'

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
}

// Mock fetch
export const mockFetch = (response: any, ok = true, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(response),
    } as Response)
  )
}

// Mock API response helpers
export const mockHintApiSuccess = (response: HintResponse) => {
  mockFetch(response, true, 200)
}

export const mockHintApiError = (error: ApiError) => {
  mockFetch(error, false, error.status_code)
}

export const mockSubmitApiSuccess = (response: SubmitResponse) => {
  mockFetch(response, true, 200)
}

export const mockSubmitApiError = (error: ApiError) => {
  mockFetch(error, false, error.status_code)
}

// Mock network failure
export const mockNetworkFailure = () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('Network request failed')))
}

// Wait for loading states
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// Custom render function
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
