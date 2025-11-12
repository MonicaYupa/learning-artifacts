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
                    "hints": [
                        "Focus on feedback that indicates blockers or significant friction, not just nice-to-haves",
                        "Look for patterns where multiple users mention similar issues",
                        "Consider both frequency of mention and severity of impact on user experience",
                    ],
                    "validation_criteria": {
                        "identifies_critical_issues": "Recognizes bugs/crashes as high priority",
                        "spots_patterns": "Notes multiple mentions of performance and discoverability",
                        "justifies_priorities": "Explains why certain issues should be addressed first",
                    },
                    "model_answer": "Top 3 pain points: 1) Report loading performance (5+ minutes) - multiple users mentioned slow performance, with one willing to pay for improvement, indicating high value. 2) Search discoverability - two separate users couldn't find the search function, suggesting a UX issue affecting task completion. 3) Mobile app performance - specific complaint about mobile being slower than web, creating platform inconsistency.",
                    "model_explanation": "This answer demonstrates strong prioritization by identifying issues with both frequency and impact. It distinguishes between resolved issues (export crash) and active problems, recognizes when users signal high willingness to pay (performance), and identifies UX patterns (search discoverability).",
                    "estimated_minutes": 8,
                },
                {
                    "sequence": 2,
                    "type": "comparative",
                    "prompt": "Your engineering team can only tackle one of these features next sprint. Rank these options from highest to lowest priority and justify your ranking.",
                    "options": [
                        "A) Add social media login (OAuth) - Requested by 12 users, engineering estimates 2 weeks",
                        "B) Fix critical bug causing data loss for 2% of users - Affects ~500 users, engineering estimates 1 week",
                        "C) Implement dark mode - Most requested feature (45 users), engineering estimates 3 weeks",
                        "D) Add bulk export feature - Requested by 8 enterprise customers, engineering estimates 1 week",
                    ],
                    "hints": [
                        "Consider the severity of impact vs. the number of users affected",
                        "Think about which issues are blockers vs. enhancements",
                        "Factor in both user impact and business impact (revenue, retention)",
                    ],
                    "validation_criteria": {
                        "prioritizes_critical_issues": "Places bug fix high in ranking",
                        "considers_business_value": "Weighs enterprise customer requests appropriately",
                        "balances_factors": "Considers impact, effort, and user demand together",
                    },
                    "model_answer": "Ranking: B, D, A, C. The critical bug (B) must be fixed immediately - data loss affects user trust and can cause churn, despite affecting only 2% of users. The bulk export (D) comes next because enterprise customers directly impact revenue and it's quick to implement. Social login (A) is a nice enhancement but not blocking users. Dark mode (C) is highly requested but takes the most time and is purely aesthetic, making it lowest priority despite popularity.",
                    "model_explanation": "This ranking demonstrates product judgment by prioritizing issues by severity (data loss is critical), business value (enterprise customers), and effort-to-value ratio. It correctly identifies that popularity alone doesn't determine priority when critical issues exist.",
                    "estimated_minutes": 7,
                },
                {
                    "sequence": 3,
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
                    "hints": [
                        "Reach should consider both immediate adoption and growth potential",
                        "Impact includes both user value and business value (revenue potential)",
                        "Confidence should account for the quality of your data - surveys and competitor analysis inform this",
                    ],
                    "validation_criteria": {
                        "realistic_estimates": "Provides reasonable numbers based on the given data",
                        "justifies_ratings": "Explains the reasoning behind impact and confidence scores",
                        "considers_revenue": "Acknowledges the business model change in impact assessment",
                    },
                    "model_answer": "Reach: ~135 users in Q1 (30% of 450 surveyed users), potential to grow to 1000+ as teams invite members. Impact: High (2) - creates new revenue stream ($49 vs $19), enables enterprise sales, and competitors show strong adoption. Confidence: Medium (80%) - we have survey data and competitor benchmarks, but haven't validated willingness to pay. Effort: 16 person-months (8 weeks × 2 engineers). RICE Score: (135 × 2 × 0.8) / 16 = 13.5",
                    "model_explanation": "This assessment shows strong analytical thinking by translating survey data into reach estimates, recognizing the strategic value beyond just feature addition (revenue model change), appropriately moderating confidence due to lack of payment validation, and properly calculating effort. The consideration of network effects (teams inviting members) demonstrates sophisticated product thinking.",
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
                    "type": "analysis",
                    "prompt": "Analyze this social media campaign data and identify which platform is performing best and why.",
                    "material": """Campaign Performance (Last 30 Days):
Instagram: 50K impressions, 2.5K clicks (5% CTR), $500 spent, 120 conversions ($4.17 CPA)
Facebook: 100K impressions, 3K clicks (3% CTR), $600 spent, 150 conversions ($4.00 CPA)
Twitter: 25K impressions, 500 clicks (2% CTR), $200 spent, 25 conversions ($8.00 CPA)
LinkedIn: 20K impressions, 800 clicks (4% CTR), $400 spent, 80 conversions ($5.00 CPA)

Campaign Goal: Generate qualified leads for B2B SaaS product
""",
                    "hints": [
                        "Consider both cost efficiency and audience quality for a B2B product",
                        "CTR and CPA tell different stories - think about which matters more",
                        "Platform relevance matters for B2B audiences",
                    ],
                    "validation_criteria": {
                        "analyzes_multiple_metrics": "Looks beyond just one metric like CTR or CPA",
                        "considers_context": "Evaluates performance relative to B2B SaaS goals",
                        "makes_recommendation": "Suggests where to allocate budget going forward",
                    },
                    "model_answer": "LinkedIn is performing best for this B2B campaign despite having the second-highest CPA ($5.00). While Facebook has the lowest CPA ($4.00), LinkedIn's audience quality likely includes decision-makers and professionals more relevant for B2B SaaS. LinkedIn also has the second-best CTR (4%), suggesting good ad-audience fit. Instagram performs well on CPA but may generate lower-quality leads for B2B. Twitter's high CPA ($8.00) indicates poor targeting. Recommendation: Increase LinkedIn budget and test audience refinement on Instagram.",
                    "model_explanation": "This analysis demonstrates strategic thinking by prioritizing lead quality over pure cost efficiency for a B2B context, recognizing platform-audience fit, and providing actionable recommendations rather than just describing the data.",
                    "estimated_minutes": 8,
                },
                {
                    "sequence": 2,
                    "type": "comparative",
                    "prompt": "Rank these marketing channels for a new sustainable fashion brand launching with a $50K budget, from best to worst. Justify your ranking.",
                    "options": [
                        "A) Instagram influencer partnerships with eco-conscious lifestyle creators (Est. $25K, potential reach 500K)",
                        "B) Google Search Ads targeting 'sustainable clothing' keywords (Est. $15K, potential reach 100K)",
                        "C) TikTok organic content creation with trending audio (Est. $5K for creator, potential reach unknown but viral potential)",
                        "D) Partnership with environmental nonprofit for co-branded campaign (Est. $10K donation, potential reach 200K + credibility boost)",
                    ],
                    "hints": [
                        "Consider brand building vs. direct sales for a new brand",
                        "Think about which channels align with 'sustainable fashion' values",
                        "Factor in both reach and credibility with the target audience",
                    ],
                    "validation_criteria": {
                        "aligns_with_brand": "Recognizes sustainable/eco-conscious brand positioning",
                        "balances_awareness_and_conversion": "Considers both top-of-funnel and bottom-of-funnel needs",
                        "budget_conscious": "Acknowledges the limited budget and recommends allocation",
                    },
                    "model_answer": "Ranking: A, D, C, B. Instagram influencers (A) are the top priority because eco-conscious creators authentically align with brand values and can drive both awareness and sales through trusted recommendations. Nonprofit partnership (D) ranks second for establishing credibility and reaching genuinely interested audiences. TikTok (C) offers high potential ROI for low cost if content goes viral, making it worth testing. Google Ads (B) ranks last because competing on 'sustainable clothing' keywords is expensive, and a new brand lacks the trust signals needed to convert cold search traffic effectively.",
                    "model_explanation": "This ranking shows marketing maturity by prioritizing brand-value alignment and trust-building for a new sustainable brand, recognizing that authentic partnerships matter more than pure reach for this category. The answer also demonstrates budget awareness by identifying TikTok's asymmetric risk/reward profile.",
                    "estimated_minutes": 7,
                },
                {
                    "sequence": 3,
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
                    "hints": [
                        "Consider whether the attention-grabber matches the audience (managers vs. individual contributors)",
                        "Evaluate if the proof points are credible and relevant",
                        "Think about friction in the conversion path",
                    ],
                    "validation_criteria": {
                        "identifies_strengths": "Recognizes what's working in the current email",
                        "spots_weaknesses": "Points out specific areas for improvement",
                        "provides_recommendations": "Suggests concrete changes to improve performance",
                    },
                    "model_answer": "Attention: Subject line is attention-grabbing but potentially over-promises ('10x' may seem clickbait). Works well for managers feeling overwhelmed. Interest: Opening question resonates with app-switching pain point. Listing 50K teams provides social proof, but could be more specific about *which* teams (Fortune 500? Startups?). Desire: Feature list is solid, but lacks emotional hooks. The PS about saving 2 hours/day is the strongest desire creator but buried at the end - should be more prominent. Action: CTA is clear and low-friction (no credit card). Could be stronger by adding urgency or personalizing the offer. Recommendations: Move time-savings stat higher, add specific customer logo, test subject line variants that are specific but not hyperbolic.",
                    "model_explanation": "This evaluation demonstrates marketing sophistication by identifying both strengths and weaknesses, recognizing when claims might undermine credibility, and prioritizing changes by impact. The recommendation to elevate the time-savings stat shows understanding of value proposition hierarchy.",
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
                    "type": "analysis",
                    "prompt": "Analyze this stakeholder feedback and identify potential requirement conflicts that need to be resolved.",
                    "material": """Stakeholder Interviews for New CRM System:

Sales VP: "We need the system to automatically log every customer interaction - emails, calls, everything. Sales reps shouldn't have to manually enter anything."

IT Director: "We can't integrate with every email system. Manual logging is more realistic. Also, we need strong data governance - not everything should be automatically captured due to privacy concerns."

Sales Rep (Team Lead): "I need to see my entire team's pipeline at a glance. Real-time visibility is critical for coaching."

Finance Director: "We need accurate forecasting based on deal stages. Sales reps currently move deals through stages too optimistically, inflating the forecast."

Sales Rep: "I don't want my manager micromanaging every deal. Some privacy in early-stage deals helps me work without pressure."
""",
                    "hints": [
                        "Look for contradictions between what different stakeholders want",
                        "Consider technical feasibility vs. business desires",
                        "Identify where stakeholder needs directly oppose each other",
                    ],
                    "validation_criteria": {
                        "identifies_conflicts": "Spots multiple requirement conflicts in the feedback",
                        "explains_tension": "Articulates why these requirements conflict",
                        "suggests_resolution": "Proposes how to address or mediate the conflicts",
                    },
                    "model_answer": "Key conflicts: 1) Automatic capture (Sales VP) vs. Privacy/governance (IT + Sales Rep) - tension between efficiency and control. 2) Pipeline transparency (Team Lead) vs. Early-stage privacy (Sales Rep) - manager visibility vs. rep autonomy. 3) Accurate forecasting (Finance) vs. Rep behavior (implied) - system rules vs. user flexibility. Resolution approaches: For #1, implement automatic logging with opt-out for sensitive communications + clear privacy policy. For #2, create configurable visibility rules by deal stage. For #3, add forecast probability fields and validation rules while keeping stage progression flexible.",
                    "model_explanation": "This analysis demonstrates strong requirements analysis by not just listing conflicts but explaining the underlying tensions, considering multiple stakeholder perspectives, and proposing pragmatic middle-ground solutions rather than simply choosing one stakeholder's needs over another's.",
                    "estimated_minutes": 8,
                },
                {
                    "sequence": 2,
                    "type": "comparative",
                    "prompt": "Your project can only include 3 of these 5 requirements in Phase 1. Rank the top 3 requirements and justify your selection.",
                    "options": [
                        "A) User authentication and role-based access control - No current security system, all users have full access",
                        "B) Mobile app version - 60% of users access via mobile web currently, app requested by 40 users",
                        "C) Advanced reporting dashboard - Users currently export to Excel to create reports, requested by management",
                        "D) Integration with existing inventory system - Manual data entry causing errors, 2-3 hours/day spent on this",
                        "E) Automated email notifications - Users currently check system multiple times/day for updates",
                    ],
                    "hints": [
                        "Consider what's blocking users vs. what's enhancing experience",
                        "Think about risk - what could cause business problems if not addressed?",
                        "Evaluate the cost of current workarounds",
                    ],
                    "validation_criteria": {
                        "prioritizes_critical_needs": "Recognizes security and data integrity issues",
                        "considers_business_impact": "Evaluates time savings and error reduction",
                        "justifies_tradeoffs": "Explains why lower-priority items can wait",
                    },
                    "model_answer": "Top 3: A, D, E. Security (A) is non-negotiable - lack of access control is a critical compliance and data risk that could cause serious business problems. Inventory integration (D) ranks second because manual data entry causes errors and wastes 15+ hours/week, directly impacting operational efficiency. Email notifications (E) take third spot because they eliminate constant system-checking behavior and are typically quick to implement. Mobile app (B) can wait because mobile web works, just not optimally. Reporting (C) is lowest priority because the Excel workaround functions adequately, and reporting often requires user feedback to get right, making it better for Phase 2.",
                    "model_explanation": "This prioritization shows business analysis maturity by distinguishing between critical risks (security), high-impact efficiency gains (integration), and nice-to-have enhancements (mobile app). The justification demonstrates understanding that existing workarounds' viability affects priority, and that some features (reporting) benefit from iterative development.",
                    "estimated_minutes": 7,
                },
                {
                    "sequence": 3,
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
                    "hints": [
                        "Consider the company's core competency - are they a software company or logistics company?",
                        "Think about total cost of ownership beyond the first year",
                        "Evaluate the risk of the IT team being pulled to other priorities",
                    ],
                    "validation_criteria": {
                        "comprehensive_analysis": "Addresses all four SWOT components for both options",
                        "realistic_assessment": "Provides honest evaluation of company capabilities",
                        "makes_recommendation": "Concludes with clear recommendation and reasoning",
                    },
                    "model_answer": "Build - Strengths: Domain expertise, lower first-year cost, custom features. Weaknesses: Small IT team already maintaining legacy systems, no route optimization expertise, ongoing maintenance burden. Opportunities: IP ownership, exact feature match. Threats: Timeline risk (6 months is tight), key developer departure, scope creep. Buy - Strengths: Proven solution (500 customers), faster deployment (3 months), dedicated support. Weaknesses: Higher total cost over 3 years (~$420K vs $150K + maintenance), 5% feature gap, vendor dependency. Opportunities: Regular updates, best practices from other customers, IT team can focus on core systems. Threats: Vendor price increases, acquisition/shutdown, customization limitations. Recommendation: Buy. The company isn't a software company, the IT team is already stretched, and the timeline is aggressive. The vendor's proven solution reduces risk significantly. The feature gap is small, and freeing up IT capacity for legacy system maintenance is more strategic than building non-core technology.",
                    "model_explanation": "This SWOT analysis demonstrates sophisticated business judgment by looking beyond surface costs to consider organizational capacity, strategic focus, and risk management. The recommendation acknowledges the higher monetary cost while arguing that it's worth it for risk reduction and strategic alignment - showing that good analysis isn't just about finding the cheapest option.",
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
                    "type": "analysis",
                    "prompt": f"Analyze the following scenario related to {topic} and identify the key factors.",
                    "material": f"This is sample material for {topic}. In a real scenario, this would contain relevant context, data, or case study information for analysis.",
                    "hints": [
                        "Start by identifying the main components or stakeholders",
                        "Look for patterns or relationships between elements",
                        "Consider both short-term and long-term implications",
                    ],
                    "validation_criteria": {
                        "identifies_key_factors": "Recognizes the main elements in the scenario",
                        "provides_analysis": "Goes beyond description to explain relationships",
                        "considers_implications": "Thinks about consequences and next steps",
                    },
                    "model_answer": f"A strong answer would identify the primary factors in this {topic} scenario, explain how they relate to each other, and discuss the potential implications of different approaches.",
                    "model_explanation": f"This demonstrates understanding of {topic} by showing analytical thinking and the ability to connect theory to practice.",
                    "estimated_minutes": 8,
                },
                {
                    "sequence": 2,
                    "type": "comparative",
                    "prompt": f"Compare these approaches to {topic} and rank them by effectiveness.",
                    "options": [
                        f"Approach A: Traditional method commonly used in {topic}",
                        f"Approach B: Modern alternative gaining popularity",
                        f"Approach C: Hybrid approach combining elements of both",
                    ],
                    "hints": [
                        "Consider the context and constraints of the situation",
                        "Think about both short-term and long-term effectiveness",
                        "Evaluate based on multiple criteria, not just one factor",
                    ],
                    "validation_criteria": {
                        "compares_multiple_dimensions": "Evaluates approaches across several criteria",
                        "provides_justification": "Explains reasoning for rankings",
                    },
                    "model_answer": f"The ranking should consider effectiveness in the context of {topic}, weighing factors like feasibility, impact, and alignment with goals.",
                    "model_explanation": "This shows critical thinking by evaluating options systematically rather than based on intuition alone.",
                    "estimated_minutes": 7,
                },
                {
                    "sequence": 3,
                    "type": "framework",
                    "prompt": f"Apply a relevant framework to analyze this {topic} scenario.",
                    "material": f"Scenario: You are facing a decision in {topic} that requires structured analysis to identify the best path forward.",
                    "scaffold": {
                        "component_1": "First element of analysis",
                        "component_2": "Second element of analysis",
                        "component_3": "Third element of analysis",
                    },
                    "hints": [
                        "Use the framework systematically for each component",
                        "Provide specific examples rather than general statements",
                        "Connect your analysis to actionable recommendations",
                    ],
                    "validation_criteria": {
                        "applies_framework_correctly": "Uses the framework structure appropriately",
                        "provides_specific_analysis": "Gives concrete examples and details",
                        "reaches_conclusions": "Synthesizes analysis into recommendations",
                    },
                    "model_answer": f"A complete framework application for {topic} would address each component with specific analysis and lead to clear recommendations.",
                    "model_explanation": "This demonstrates the ability to apply structured thinking frameworks to real scenarios.",
                    "estimated_minutes": 10,
                },
            ],
        }

    # Limit exercises to requested count
    module_data["exercises"] = module_data["exercises"][:exercise_count]

    # Add skill_level to the module data
    module_data["skill_level"] = skill_level

    return module_data


def evaluate_mock_answer(exercise: Dict, answer_text: str, hints_used: int) -> Dict:
    """
    Generate a mock evaluation for testing without Claude API

    Args:
        exercise: The exercise dictionary
        answer_text: The student's answer
        hints_used: Number of hints used (0-3)

    Returns:
        Dictionary with assessment, internal_score, and feedback
    """

    # Simple heuristic evaluation based on answer length and keywords
    answer_lower = answer_text.lower()
    answer_length = len(answer_text.split())

    # Check for key concepts in validation criteria
    criteria_keywords = []
    for criterion, description in exercise.get("validation_criteria", {}).items():
        # Extract keywords from criterion descriptions
        criteria_keywords.extend(description.lower().split())

    # Count how many criteria-related words are in the answer
    keyword_matches = sum(1 for word in criteria_keywords if word in answer_lower)

    # Scoring logic
    # Base score on answer length (longer answers tend to be more detailed)
    length_score = min(40, answer_length * 2)  # Up to 40 points for length

    # Add points for keyword matches
    keyword_score = min(40, keyword_matches * 3)  # Up to 40 points for keywords

    # Deduct points for hints used (slight penalty)
    hint_penalty = hints_used * 5  # 5 points per hint

    # Calculate total score
    total_score = max(0, min(100, length_score + keyword_score - hint_penalty))

    # Determine assessment based on score
    if total_score >= 80:
        assessment = "strong"
        feedback = "Excellent work! Your answer demonstrates strong understanding of the key concepts. You've identified the main points and provided clear reasoning. This shows you're ready to move forward."
    elif total_score >= 50:
        assessment = "developing"
        feedback = "Good start! Your answer shows emerging understanding, but could be strengthened. Consider elaborating on the key validation criteria and providing more specific examples or justification for your conclusions."
    else:
        assessment = "needs_support"
        feedback = "Your answer needs more development. Review the exercise prompt and validation criteria carefully. Consider using the hints to guide your thinking, and try to address each of the key concepts more thoroughly."

    # Add some randomness to make it more realistic (±10 points)
    score_variance = random.randint(-10, 10)
    final_score = max(0, min(100, total_score + score_variance))

    # Adjust assessment if score changed significantly
    if final_score >= 80 and assessment != "strong":
        assessment = "strong"
    elif final_score < 50 and assessment == "developing":
        assessment = "needs_support"

    return {
        "assessment": assessment,
        "internal_score": final_score,
        "feedback": feedback,
    }
