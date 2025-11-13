// Mock exercise data for UI testing and development

export const mockModule = {
  id: 'mock-module-1',
  topic: 'Critical Thinking in Technology',
  skill_level: 'intermediate',
  status: 'in_progress',
  domain: 'Technology & Ethics',
  created_at: new Date().toISOString(),
  exercises: [
    // Exercise 1: Analysis Type
    {
      id: 'ex-1',
      name: 'Analyzing AI Workplace Impact',
      type: 'analysis' as const,
      prompt:
        'Read the following article excerpt and identify the main argument, supporting evidence, and any potential weaknesses in the reasoning.',
      material: `Artificial Intelligence is rapidly transforming the workplace, with studies showing that up to 40% of jobs could be automated within the next decade. Companies implementing AI have reported productivity gains of 25-35%, primarily through the automation of repetitive tasks and data analysis.

However, this transformation comes with significant challenges. Workers in affected industries face job displacement, and retraining programs have struggled to keep pace with the speed of technological change. A recent survey found that only 15% of displaced workers successfully transitioned to comparable roles within two years.

Proponents argue that AI will create new job categories and free humans to focus on creative and strategic work. Critics counter that the new jobs require skills that many displaced workers don't possess, and the transition period will cause significant economic hardship.`,
      hints: [
        'Start by identifying the thesis statement or main claim of the argument.',
        'Look at both the supporting evidence and counter-arguments presented.',
        'Consider whether the statistics and claims are adequately supported or if there are logical gaps.',
      ],
    },

    // Exercise 2: Comparative Type
    {
      id: 'ex-2',
      name: 'Software Development Approaches',
      type: 'comparative' as const,
      prompt:
        'Compare and contrast the following three approaches to software development. Which would be most appropriate for a startup building an MVP (Minimum Viable Product) and why?',
      options: [
        'Waterfall Development: Sequential phases (requirements → design → implementation → testing → deployment). Each phase must be completed before the next begins.',
        'Agile Development: Iterative approach with 2-4 week sprints. Features are developed incrementally with continuous feedback and adaptation.',
        'Lean Startup: Focus on rapid experimentation, validated learning, and building-measuring-learning cycles. Emphasizes getting to market quickly with a basic product.',
      ],
      hints: [
        'Consider the key characteristics of each approach: flexibility, speed to market, and ability to incorporate feedback.',
        'Think about what a startup needs most in the early stages: speed, flexibility, or structure?',
        'Evaluate the trade-offs between planning thoroughly versus learning from real users quickly.',
      ],
    },

    // Exercise 3: Framework Type
    {
      id: 'ex-3',
      name: 'International Expansion SWOT',
      type: 'framework' as const,
      prompt:
        'Apply the SWOT analysis framework to evaluate whether a small e-commerce business should expand into international markets. Fill in each component of the framework.',
      scaffold: {
        Strengths: 'Internal positive attributes that give the business an advantage',
        Weaknesses: 'Internal negative attributes that place the business at a disadvantage',
        Opportunities: 'External factors the business could exploit to its advantage',
        Threats: 'External factors that could cause trouble for the business',
      },
      material: `Context: A small e-commerce business currently operates only in the United States. They sell handcrafted home decor items with annual revenue of $2M. The business has:
- 5 employees
- Strong brand loyalty (4.8/5.0 customer rating)
- Unique products not easily replicated
- Limited capital ($100K available for expansion)
- No experience with international shipping or regulations
- Website currently only in English
- Growing demand from international customers (20% of site traffic)`,
      hints: [
        'For each SWOT category, list 2-3 specific factors based on the context provided.',
        'Strengths and weaknesses are INTERNAL to the company; opportunities and threats are EXTERNAL market factors.',
        'Think about both current capabilities and potential challenges in international expansion.',
      ],
    },
  ],
}

// Mock session ID that can be used for development
export const mockSessionId = 'dev-session-123'

// Track hint state for demo mode
let currentHintLevel = 0

// Helper function to get mock module for development
export function getMockModule() {
  return mockModule
}

// Mock hint response generator
export function getMockHintResponse() {
  currentHintLevel = Math.min(currentHintLevel + 1, 3)

  const hintText = `This is hint ${currentHintLevel} for this exercise. In a real scenario, Claude would generate a progressive hint based on your current progress and the exercise context.`

  return {
    hint_text: hintText,
    hint_level: currentHintLevel,
    hints_remaining: 3 - currentHintLevel,
  }
}

// Mock submit response generator
let attemptCount = 0

export function getMockSubmitResponse(submission: {
  answer_text: string
  time_spent_seconds: number
  hints_used: number
}) {
  attemptCount++

  // Simulate different feedback based on attempt number
  if (attemptCount === 1) {
    // First attempt - developing
    return {
      assessment: 'developing' as const,
      internal_score: 0.6,
      feedback:
        'Good start! Your analysis identifies some key points, but consider expanding on the relationship between the evidence and the conclusions. Think about the assumptions underlying the argument.',
      attempt_number: 1,
      hint_available: true,
    }
  } else if (attemptCount === 2) {
    // Second attempt - strong (to show auto-advance)
    attemptCount = 0 // Reset for next exercise
    currentHintLevel = 0 // Reset hints
    return {
      assessment: 'strong' as const,
      internal_score: 0.9,
      feedback:
        'Excellent analysis! You correctly identified the main argument, evaluated the supporting evidence, and noted the potential weaknesses in the reasoning. Your critical thinking demonstrates a strong understanding of the material.',
      attempt_number: 2,
      hint_available: false,
    }
  } else {
    // Third attempt
    attemptCount = 0
    currentHintLevel = 0
    return {
      assessment: 'beginning' as const,
      internal_score: 0.4,
      feedback: "Here's how an expert might approach this exercise:",
      attempt_number: 3,
      hint_available: false,
    }
  }
}
