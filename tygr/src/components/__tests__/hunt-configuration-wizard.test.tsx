import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HuntConfigurationWizard } from '../hunt-configuration-wizard'
import { useHuntActions } from '@/stores/hunt-store'

// Mock the hunt actions
jest.mock('@/stores/hunt-store', () => ({
  useHuntActions: jest.fn(() => ({
    startHunt: jest.fn().mockResolvedValue({ id: 'test-hunt-id' }),
  })),
}))

describe('HuntConfigurationWizard', () => {
  const mockOnClose = jest.fn()
  const mockOnHuntStarted = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the wizard with all steps', () => {
    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    expect(screen.getByText('Configure Security Hunt')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 6: Target')).toBeInTheDocument()
    
    // Check all step indicators are present
    expect(screen.getByText('Target')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
    expect(screen.getByText('LLM')).toBeInTheDocument()
    expect(screen.getByText('Credentials')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <HuntConfigurationWizard
        isOpen={false}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('validates required fields before starting hunt', async () => {
    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    // Try to start hunt without filling required fields
    const startButton = screen.getByText('Start Hunt')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText('Please provide a hunt name and at least one target')).toBeInTheDocument()
    })

    expect(mockOnHuntStarted).not.toHaveBeenCalled()
  })

  it('allows adding and removing targets', async () => {
    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    // Add a target
    const targetInput = screen.getByPlaceholderText('https://example.com')
    const addButton = screen.getByText('Add')

    fireEvent.change(targetInput, { target: { value: 'https://test.com' } })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('https://test.com')).toBeInTheDocument()
    })

    // Remove the target
    const removeButton = screen.getByRole('button', { name: /remove target/i })
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(screen.queryByText('https://test.com')).not.toBeInTheDocument()
    })
  })

  it('navigates through wizard steps', async () => {
    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    // Start with step 1
    expect(screen.getByText('Step 1 of 6: Target')).toBeInTheDocument()

    // Add required fields for step 1
    const nameInput = screen.getByPlaceholderText('e.g., Production API Security Scan')
    fireEvent.change(nameInput, { target: { value: 'Test Hunt' } })

    const targetInput = screen.getByPlaceholderText('https://example.com')
    const addButton = screen.getByText('Add')
    fireEvent.change(targetInput, { target: { value: 'https://test.com' } })
    fireEvent.click(addButton)

    // Navigate to step 2
    const nextButton = screen.getByText('Next')
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 6: Profile')).toBeInTheDocument()
    })

    // Select a profile
    const quickProwlProfile = screen.getByText('Quick Prowl')
    fireEvent.click(quickProwlProfile)

    // Navigate through remaining steps
    for (let i = 2; i <= 5; i++) {
      fireEvent.click(nextButton)
      await waitFor(() => {
        expect(screen.getByText(`Step ${i + 1} of 6:`)).toBeInTheDocument()
      })
    }
  })

  it('selects hunt profile and updates configuration', async () => {
    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    // Navigate to profile step
    const nextButton = screen.getByText('Next')
    
    // Add required fields for step 1
    const nameInput = screen.getByPlaceholderText('e.g., Production API Security Scan')
    fireEvent.change(nameInput, { target: { value: 'Test Hunt' } })

    const targetInput = screen.getByPlaceholderText('https://example.com')
    const addButton = screen.getByText('Add')
    fireEvent.change(targetInput, { target: { value: 'https://test.com' } })
    fireEvent.click(addButton)
    
    fireEvent.click(nextButton)

    // Select Quick Prowl profile
    const quickProwlProfile = screen.getByText('Quick Prowl')
    fireEvent.click(quickProwlProfile)

    // Verify profile is selected
    await waitFor(() => {
      const profileCard = quickProwlProfile.closest('div')
      expect(profileCard).toHaveClass('border-tygr-orange-500')
    })
  })

  it('toggles agents in agent composition step', async () => {
    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    const nextButton = screen.getByText('Next')
    
    // Add required fields for step 1
    const nameInput = screen.getByPlaceholderText('e.g., Production API Security Scan')
    fireEvent.change(nameInput, { target: { value: 'Test Hunt' } })

    const targetInput = screen.getByPlaceholderText('https://example.com')
    const addButton = screen.getByText('Add')
    fireEvent.change(targetInput, { target: { value: 'https://test.com' } })
    fireEvent.click(addButton)
    
    // Navigate to agents step (step 3)
    fireEvent.click(nextButton) // Profile
    fireEvent.click(nextButton) // Agents

    await waitFor(() => {
      expect(screen.getByText('Step 3 of 6: Agents')).toBeInTheDocument()
    })

    // Toggle an agent
    const apiScannerAgent = screen.getByText('API Scanner')
    fireEvent.click(apiScannerAgent)

    // Verify agent is selected
    await waitFor(() => {
      const agentCard = apiScannerAgent.closest('div')
      expect(agentCard).toHaveClass('border-tygr-orange-500')
    })

    // Deselect the agent
    fireEvent.click(apiScannerAgent)

    // Verify agent is deselected
    await waitFor(() => {
      const agentCard = apiScannerAgent.closest('div')
      expect(agentCard).not.toHaveClass('border-tygr-orange-500')
    })
  })

  it('handles credential input with show/hide functionality', async () => {
    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    const nextButton = screen.getByText('Next')
    
    // Add required fields for step 1
    const nameInput = screen.getByPlaceholderText('e.g., Production API Security Scan')
    fireEvent.change(nameInput, { target: { value: 'Test Hunt' } })

    const targetInput = screen.getByPlaceholderText('https://example.com')
    const addButton = screen.getByText('Add')
    fireEvent.change(targetInput, { target: { value: 'https://test.com' } })
    fireEvent.click(addButton)
    
    // Navigate to credentials step (step 5)
    fireEvent.click(nextButton) // Profile
    fireEvent.click(nextButton) // Agents
    fireEvent.click(nextButton) // LLM
    fireEvent.click(nextButton) // Credentials

    await waitFor(() => {
      expect(screen.getByText('Step 5 of 6: Credentials')).toBeInTheDocument()
    })

    // Test show/hide credentials
    const showHideButton = screen.getByText('Show')
    const passwordInput = screen.getByPlaceholderText('••••••••')

    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(showHideButton)

    await waitFor(() => {
      expect(passwordInput).toHaveAttribute('type', 'text')
      expect(screen.getByText('Hide')).toBeInTheDocument()
    })
  })

  it('shows review summary before starting hunt', async () => {
    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    const nextButton = screen.getByText('Next')
    
    // Fill in all required information
    const nameInput = screen.getByPlaceholderText('e.g., Production API Security Scan')
    fireEvent.change(nameInput, { target: { value: 'Test Hunt' } })

    const targetInput = screen.getByPlaceholderText('https://example.com')
    const addButton = screen.getByText('Add')
    fireEvent.change(targetInput, { target: { value: 'https://test.com' } })
    fireEvent.click(addButton)
    
    // Navigate to review step
    fireEvent.click(nextButton) // Profile
    fireEvent.click(nextButton) // Agents
    fireEvent.click(nextButton) // LLM
    fireEvent.click(nextButton) // Credentials
    fireEvent.click(nextButton) // Review

    await waitFor(() => {
      expect(screen.getByText('Step 6 of 6: Review')).toBeInTheDocument()
      expect(screen.getByText('Hunt Configuration Summary')).toBeInTheDocument()
      expect(screen.getByText('Test Hunt')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument() // targets count
    })
  })

  it('successfully starts a hunt with valid configuration', async () => {
    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    // Fill in all required information
    const nameInput = screen.getByPlaceholderText('e.g., Production API Security Scan')
    fireEvent.change(nameInput, { target: { value: 'Test Hunt' } })

    const targetInput = screen.getByPlaceholderText('https://example.com')
    const addButton = screen.getByText('Add')
    fireEvent.change(targetInput, { target: { value: 'https://test.com' } })
    fireEvent.click(addButton)
    
    // Navigate to review step
    const nextButton = screen.getByText('Next')
    fireEvent.click(nextButton) // Profile
    fireEvent.click(nextButton) // Agents
    fireEvent.click(nextButton) // LLM
    fireEvent.click(nextButton) // Credentials
    fireEvent.click(nextButton) // Review

    // Start the hunt
    const startHuntButton = screen.getByText('Start Hunt')
    fireEvent.click(startHuntButton)

    await waitFor(() => {
      expect(useHuntActions().startHunt).toHaveBeenCalled()
      expect(mockOnHuntStarted).toHaveBeenCalledWith('test-hunt-id')
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles hunt start failure gracefully', async () => {
    // Mock startHunt to throw an error
    (useHuntActions().startHunt as jest.Mock).mockRejectedValue(new Error('Failed to start hunt'))

    // Mock window.alert
    const alertMock = jest.spyOn(window, 'alert').mockImplementation()

    render(
      <HuntConfigurationWizard
        isOpen={true}
        onClose={mockOnClose}
        onHuntStarted={mockOnHuntStarted}
      />
    )

    // Fill in all required information
    const nameInput = screen.getByPlaceholderText('e.g., Production API Security Scan')
    fireEvent.change(nameInput, { target: { value: 'Test Hunt' } })

    const targetInput = screen.getByPlaceholderText('https://example.com')
    const addButton = screen.getByText('Add')
    fireEvent.change(targetInput, { target: { value: 'https://test.com' } })
    fireEvent.click(addButton)
    
    // Navigate to review step
    const nextButton = screen.getByText('Next')
    fireEvent.click(nextButton) // Profile
    fireEvent.click(nextButton) // Agents
    fireEvent.click(nextButton) // LLM
    fireEvent.click(nextButton) // Credentials
    fireEvent.click(nextButton) // Review

    // Start the hunt
    const startHuntButton = screen.getByText('Start Hunt')
    fireEvent.click(startHuntButton)

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Failed to start hunt: Failed to start hunt')
    })

    alertMock.mockRestore()
  })
})