import { render } from '@/lib/test-utils/test-utils'
import CelebrationConfetti from '@/components/CelebrationConfetti'

describe('CelebrationConfetti', () => {
  it('renders when show is true', () => {
    const { container } = render(<CelebrationConfetti show={true} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('does not render when show is false', () => {
    const { container } = render(<CelebrationConfetti show={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders confetti overlay with correct classes', () => {
    const { container } = render(<CelebrationConfetti show={true} />)
    const overlay = container.querySelector('.absolute')
    expect(overlay).toBeInTheDocument()
  })

  it('has celebration animation styles when visible', () => {
    const { container } = render(<CelebrationConfetti show={true} />)
    const confettiElement = container.firstChild as HTMLElement
    expect(confettiElement).toHaveClass('pointer-events-none')
  })
})
