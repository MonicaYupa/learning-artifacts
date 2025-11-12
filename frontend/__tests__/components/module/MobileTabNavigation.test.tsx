import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MobileTabNavigation from '@/components/module/MobileTabNavigation'
import { MockModuleProvider } from '@/lib/test-utils/providers'

describe('MobileTabNavigation', () => {
  it('renders both tabs', () => {
    render(
      <MockModuleProvider value={{ activeTab: 'exercise' }}>
        <MobileTabNavigation />
      </MockModuleProvider>
    )

    expect(screen.getByRole('tab', { name: /exercise/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /workspace/i })).toBeInTheDocument()
  })

  it('shows exercise tab as selected', () => {
    render(
      <MockModuleProvider value={{ activeTab: 'exercise' }}>
        <MobileTabNavigation />
      </MockModuleProvider>
    )

    const exerciseTab = screen.getByRole('tab', { name: /exercise/i })
    expect(exerciseTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows editor tab as selected', () => {
    render(
      <MockModuleProvider value={{ activeTab: 'editor' }}>
        <MobileTabNavigation />
      </MockModuleProvider>
    )

    const editorTab = screen.getByRole('tab', { name: /workspace/i })
    expect(editorTab).toHaveAttribute('aria-selected', 'true')
  })

  it('calls setActiveTab when exercise tab is clicked', async () => {
    const user = userEvent.setup()
    const mockSetActiveTab = jest.fn()
    render(
      <MockModuleProvider value={{ activeTab: 'editor', setActiveTab: mockSetActiveTab }}>
        <MobileTabNavigation />
      </MockModuleProvider>
    )

    const exerciseTab = screen.getByRole('tab', { name: /exercise/i })
    await user.click(exerciseTab)

    expect(mockSetActiveTab).toHaveBeenCalledWith('exercise')
  })

  it('calls setActiveTab when workspace tab is clicked', async () => {
    const user = userEvent.setup()
    const mockSetActiveTab = jest.fn()
    render(
      <MockModuleProvider value={{ activeTab: 'exercise', setActiveTab: mockSetActiveTab }}>
        <MobileTabNavigation />
      </MockModuleProvider>
    )

    const workspaceTab = screen.getByRole('tab', { name: /workspace/i })
    await user.click(workspaceTab)

    expect(mockSetActiveTab).toHaveBeenCalledWith('editor')
  })

  it('applies correct ARIA controls attributes', () => {
    render(
      <MockModuleProvider value={{ activeTab: 'exercise' }}>
        <MobileTabNavigation />
      </MockModuleProvider>
    )

    expect(screen.getByRole('tab', { name: /exercise/i })).toHaveAttribute(
      'aria-controls',
      'exercise-panel'
    )
    expect(screen.getByRole('tab', { name: /workspace/i })).toHaveAttribute(
      'aria-controls',
      'editor-panel'
    )
  })
})
