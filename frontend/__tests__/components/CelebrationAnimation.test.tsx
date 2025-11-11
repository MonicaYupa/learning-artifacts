import { render, screen } from '@/lib/test-utils/test-utils'
import CelebrationAnimation from '@/components/CelebrationAnimation'

describe('CelebrationAnimation', () => {
  it('renders celebration animation container', () => {
    render(<CelebrationAnimation />)
    const animation = screen.getByRole('img', { name: /celebration/i })
    expect(animation).toBeInTheDocument()
  })

  it('applies correct CSS classes for animation', () => {
    render(<CelebrationAnimation />)
    const animation = screen.getByRole('img', { name: /celebration/i })
    expect(animation).toHaveClass('animate-celebration')
  })

  it('respects prefers-reduced-motion', () => {
    // Mock matchMedia for reduced motion
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    render(<CelebrationAnimation />)
    const animation = screen.getByRole('img', { name: /celebration/i })
    expect(animation).toHaveClass('motion-reduce')
  })

  it('renders without errors when animation completes', () => {
    const { container } = render(<CelebrationAnimation />)
    expect(container).toBeInTheDocument()
  })

  it('has appropriate ARIA attributes', () => {
    render(<CelebrationAnimation />)
    const animation = screen.getByRole('img', { name: /celebration/i })
    expect(animation).toHaveAttribute('aria-label', expect.stringContaining('celebration'))
  })
})
