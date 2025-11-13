"""
Mock Data Generator
Provides realistic mock module data and answer evaluation for testing without Claude API calls
"""

import random
import re
from typing import Dict


def extract_mock_topic_and_level(message: str) -> Dict[str, str]:
    """
    Extract topic and skill level from user message using simple pattern matching

    Args:
        message: User's message describing what they want to learn

    Returns:
        Dictionary containing topic and skill_level
    """
    message_lower = message.lower()

    # Extract skill level
    skill_level = "beginner"  # Default
    if any(
        word in message_lower
        for word in ["advanced", "expert", "senior", "experienced"]
    ):
        skill_level = "advanced"
    elif any(
        word in message_lower
        for word in ["intermediate", "moderate", "some experience"]
    ):
        skill_level = "intermediate"

    # Extract topic using common patterns
    topic = "General Learning"  # Default

    # Pattern 1: "learn about X" or "learn X"
    learn_pattern = r"learn(?:\s+about)?\s+([a-zA-Z\s]+?)(?:\s+(?:as|at|for)|$)"
    match = re.search(learn_pattern, message_lower)
    if match:
        topic = match.group(1).strip()

    # Pattern 2: "I want to X" or "I'd like to X"
    want_pattern = r"(?:want|like|interested in)\s+(?:to\s+)?(?:learn\s+)?([a-zA-Z\s]+?)(?:\s+(?:as|at|for)|$)"
    if not match:
        match = re.search(want_pattern, message_lower)
        if match:
            topic = match.group(1).strip()

    # Pattern 3: Just mentioned directly (e.g., "Python" or "Product Management")
    common_topics = {
        "python": "Python Basics",
        "javascript": "JavaScript Fundamentals",
        "react": "React Development",
        "product management": "Product Management",
        "product": "Product Management",
        "marketing": "Marketing Strategy",
        "business analysis": "Business Analysis",
        "data science": "Data Science",
        "machine learning": "Machine Learning",
        "web development": "Web Development",
        "ux": "UX Design",
        "ui": "UI Design",
        "design": "Design Fundamentals",
    }

    for keyword, full_topic in common_topics.items():
        if keyword in message_lower:
            topic = full_topic
            break

    # Clean up topic
    topic = topic.title().strip()

    # If topic is too short or generic, provide a default
    if len(topic) < 3 or topic in ["Learn", "About", "To"]:
        topic = "General Learning"

    return {"topic": topic, "skill_level": skill_level}


def generate_mock_module(topic: str, skill_level: str, exercise_count: int = 3) -> Dict:
    """
    Generate a realistic mock learning module for testing

    Args:
        topic: The learning topic
        skill_level: beginner, intermediate, or advanced
        exercise_count: Number of exercises to generate (1-5)

    Returns:
        Dictionary containing module data with title, domain, and exercises
    """

    # Map topics to domain format
    domain = topic.lower().replace(" ", "_")

    # Create topic-specific content based on the request
    mock_modules = {
        "product_management": {
            "title": "Introduction to Product Management",
            "domain": "product_management",
            "exercises": [
                {
                    "sequence": 1,
                    "name": "Customer Feedback Analysis",
                    "type": "analysis",
                    "prompt": "Analyze the following customer feedback and identify the top 3 pain points that should be prioritized for the product roadmap.",
                    "material": """Customer Feedback Summary:
- "The app crashes every time I try to export data to Excel"
- "I love the reporting feature, but it takes 5+ minutes to load"
- "Can't find the search function - had to ask support where it was"
- "Export works great now, thanks for fixing it!"
- "The mobile app is slow compared to the web version"
- "Wish I could customize the dashboard layout"
- "Search is hidden in the menu - should be more prominent"
- "Would pay extra for faster report generation"
""",
                    "estimated_minutes": 8,
                },
                {
                    "sequence": 2,
                    "name": "Feature Priority Ranking",
                    "type": "comparative",
                    "prompt": "Your engineering team can only tackle one of these features next sprint. Rank these options from highest to lowest priority and justify your ranking.",
                    "options": [
                        "A) Add social media login (OAuth) - Requested by 12 users, engineering estimates 2 weeks",
                        "B) Fix critical bug causing data loss for 2% of users - Affects ~500 users, engineering estimates 1 week",
                        "C) Implement dark mode - Most requested feature (45 users), engineering estimates 3 weeks",
                        "D) Add bulk export feature - Requested by 8 enterprise customers, engineering estimates 1 week",
                    ],
                    "estimated_minutes": 7,
                },
                {
                    "sequence": 3,
                    "name": "RICE Framework Evaluation",
                    "type": "framework",
                    "prompt": "Use the RICE prioritization framework (Reach, Impact, Confidence, Effort) to evaluate this feature request. Fill in each component with your assessment.",
                    "material": """Feature Request: "Team Collaboration Workspace"
Users can invite team members to shared workspaces, assign tasks, and comment on projects in real-time.

Context:
- Current product is single-user focused
- 30% of surveyed users (450 people) said they'd use team features
- Engineering estimates 8 weeks of development
- Similar features in competitor products have 60% adoption rates
- Would enable us to charge for team plans ($49/user/month vs. current $19/month)
""",
                    "scaffold": {
                        "reach": "How many users/customers will this feature affect in a quarter? Estimate the number.",
                        "impact": "How much will this feature impact users? Rate as Massive (3), High (2), Medium (1), Low (0.5), or Minimal (0.25)",
                        "confidence": "How confident are you in your estimates? Rate as High (100%), Medium (80%), or Low (50%)",
                        "effort": "How many person-months will this require? Estimate total team effort.",
                    },
                    "estimated_minutes": 10,
                },
            ],
        },
        "marketing_strategy": {
            "title": "Marketing Strategy Fundamentals",
            "domain": "marketing_strategy",
            "exercises": [
                {
                    "sequence": 1,
                    "name": "Social Media Campaign Analysis",
                    "type": "analysis",
                    "prompt": "Analyze this social media campaign data and identify which platform is performing best and why.",
                    "material": """Campaign Performance (Last 30 Days):
Instagram: 50K impressions, 2.5K clicks (5% CTR), $500 spent, 120 conversions ($4.17 CPA)
Facebook: 100K impressions, 3K clicks (3% CTR), $600 spent, 150 conversions ($4.00 CPA)
Twitter: 25K impressions, 500 clicks (2% CTR), $200 spent, 25 conversions ($8.00 CPA)
LinkedIn: 20K impressions, 800 clicks (4% CTR), $400 spent, 80 conversions ($5.00 CPA)

Campaign Goal: Generate qualified leads for B2B SaaS product
""",
                    "estimated_minutes": 8,
                },
                {
                    "sequence": 2,
                    "name": "Marketing Channel Ranking",
                    "type": "comparative",
                    "prompt": "Rank these marketing channels for a new sustainable fashion brand launching with a $50K budget, from best to worst. Justify your ranking.",
                    "options": [
                        "A) Instagram influencer partnerships with eco-conscious lifestyle creators (Est. $25K, potential reach 500K)",
                        "B) Google Search Ads targeting 'sustainable clothing' keywords (Est. $15K, potential reach 100K)",
                        "C) TikTok organic content creation with trending audio (Est. $5K for creator, potential reach unknown but viral potential)",
                        "D) Partnership with environmental nonprofit for co-branded campaign (Est. $10K donation, potential reach 200K + credibility boost)",
                    ],
                    "estimated_minutes": 7,
                },
                {
                    "sequence": 3,
                    "name": "AIDA Framework Application",
                    "type": "framework",
                    "prompt": "Apply the AIDA framework (Attention, Interest, Desire, Action) to this email marketing campaign. Evaluate each component.",
                    "material": """Subject Line: "Your productivity is about to 10x"

Email Body:
Hey [Name],

Are you tired of switching between 12 different apps just to get work done?

TimeFlow brings everything into one place - tasks, calendar, notes, and team chat. Over 50,000 teams have made the switch.

Here's what makes TimeFlow different:
- AI-powered task prioritization
- Built-in video calls (no Zoom needed)
- Works offline on mobile

Start your free 14-day trial - no credit card required.

[CTA Button: Try TimeFlow Free]

PS - Teams that switch to TimeFlow save an average of 2 hours per day.

Campaign context: Targeting mid-level managers at tech companies, average age 30-45
""",
                    "scaffold": {
                        "attention": "How effective is the subject line and opening at grabbing attention? What works or doesn't work?",
                        "interest": "Does the email build interest in the product? How could it be stronger?",
                        "desire": "What techniques are used to create desire? Are they effective for this audience?",
                        "action": "How clear and compelling is the call-to-action? Any barriers to taking action?",
                    },
                    "estimated_minutes": 10,
                },
            ],
        },
        "business_analysis": {
            "title": "Business Analysis Essentials",
            "domain": "business_analysis",
            "exercises": [
                {
                    "sequence": 1,
                    "name": "Stakeholder Requirement Conflicts",
                    "type": "analysis",
                    "prompt": "Analyze this stakeholder feedback and identify potential requirement conflicts that need to be resolved.",
                    "material": """Stakeholder Interviews for New CRM System:

Sales VP: "We need the system to automatically log every customer interaction - emails, calls, everything. Sales reps shouldn't have to manually enter anything."

IT Director: "We can't integrate with every email system. Manual logging is more realistic. Also, we need strong data governance - not everything should be automatically captured due to privacy concerns."

Sales Rep (Team Lead): "I need to see my entire team's pipeline at a glance. Real-time visibility is critical for coaching."

Finance Director: "We need accurate forecasting based on deal stages. Sales reps currently move deals through stages too optimistically, inflating the forecast."

Sales Rep: "I don't want my manager micromanaging every deal. Some privacy in early-stage deals helps me work without pressure."
""",
                    "estimated_minutes": 8,
                },
                {
                    "sequence": 2,
                    "name": "Phase 1 Requirements Selection",
                    "type": "comparative",
                    "prompt": "Your project can only include 3 of these 5 requirements in Phase 1. Rank the top 3 requirements and justify your selection.",
                    "options": [
                        "A) User authentication and role-based access control - No current security system, all users have full access",
                        "B) Mobile app version - 60% of users access via mobile web currently, app requested by 40 users",
                        "C) Advanced reporting dashboard - Users currently export to Excel to create reports, requested by management",
                        "D) Integration with existing inventory system - Manual data entry causing errors, 2-3 hours/day spent on this",
                        "E) Automated email notifications - Users currently check system multiple times/day for updates",
                    ],
                    "estimated_minutes": 7,
                },
                {
                    "sequence": 3,
                    "name": "Build vs Buy Analysis",
                    "type": "framework",
                    "prompt": "Apply SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) to evaluate whether this company should build vs. buy a solution.",
                    "material": """Scenario: Mid-size logistics company (500 employees) needs a route optimization system.

Current State:
- Drivers use manual route planning (Google Maps + experience)
- 10-person IT team with 2 developers (mostly maintaining legacy systems)
- Strong domain expertise in logistics and regional delivery challenges
- $200K budget allocated for this project
- Timeline: Need solution in 6 months

Build Option:
- Estimated cost: $150K (2 developers for 6 months)
- Custom features for our specific delivery constraints
- Ongoing maintenance responsibility

Buy Option (Leading vendor):
- Estimated cost: $180K first year ($60K setup + $120K annual license)
- $120K annually thereafter
- 3-month implementation, 95% feature match
- Vendor has 500+ logistics customers
""",
                    "scaffold": {
                        "strengths": "What advantages does the company have for building? What are the vendor's strengths?",
                        "weaknesses": "What limitations exist for building in-house? What are the vendor solution's weaknesses?",
                        "opportunities": "What future benefits could each approach unlock?",
                        "threats": "What risks does each approach carry?",
                    },
                    "estimated_minutes": 10,
                },
            ],
        },
    }

    # Get the mock module data or use a generic one
    if domain in mock_modules:
        module_data = mock_modules[domain]
    else:
        # Generic fallback module
        module_data = {
            "title": f"{topic.title()} Fundamentals",
            "domain": domain,
            "exercises": [
                {
                    "sequence": 1,
                    "name": "Key Factors Analysis",
                    "type": "analysis",
                    "prompt": f"Analyze the following scenario related to {topic} and identify the key factors.",
                    "material": f"This is sample material for {topic}. In a real scenario, this would contain relevant context, data, or case study information for analysis.",
                    "estimated_minutes": 8,
                },
                {
                    "sequence": 2,
                    "name": "Approach Comparison",
                    "type": "comparative",
                    "prompt": f"Compare these approaches to {topic} and rank them by effectiveness.",
                    "options": [
                        f"Approach A: Traditional method commonly used in {topic}",
                        f"Approach B: Modern alternative gaining popularity",
                        f"Approach C: Hybrid approach combining elements of both",
                    ],
                    "estimated_minutes": 7,
                },
                {
                    "sequence": 3,
                    "name": "Framework Application",
                    "type": "framework",
                    "prompt": f"Apply a relevant framework to analyze this {topic} scenario.",
                    "material": f"Scenario: You are facing a decision in {topic} that requires structured analysis to identify the best path forward.",
                    "scaffold": {
                        "component_1": "First element of analysis",
                        "component_2": "Second element of analysis",
                        "component_3": "Third element of analysis",
                    },
                    "estimated_minutes": 10,
                },
            ],
        }

    # Limit exercises to requested count
    module_data["exercises"] = module_data["exercises"][:exercise_count]

    # Add skill_level to the module data
    module_data["skill_level"] = skill_level

    return module_data


def evaluate_mock_answer() -> Dict:
    """
    Generate a mock evaluation for testing without Claude API

    Returns:
        Dictionary with assessment, internal_score, and feedback
    """

    # Simple mock scoring - just return an arbitrary score
    score = random.randint(60, 95)

    # Determine assessment based on score
    if score >= 80:
        assessment = "strong"
        feedback = "Excellent work! Your answer demonstrates strong understanding of the key concepts."
    elif score >= 60:
        assessment = "developing"
        feedback = "Good start! Your answer shows emerging understanding, but could be strengthened."
    else:
        assessment = "beginning"
        feedback = (
            "Your answer needs more development. Review the exercise prompt carefully."
        )

    return {
        "assessment": assessment,
        "internal_score": score,
        "feedback": feedback,
    }
