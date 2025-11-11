"""
Claude API Service
Handles interactions with Claude API for module generation and answer evaluation
"""

import json
from typing import Dict, List

from anthropic import Anthropic
from config.settings import settings
from services.mock_data import (
    evaluate_mock_answer,
    extract_mock_topic_and_level,
    generate_mock_module,
)
from utils.retry_handler import with_retry

# Initialize Anthropic client
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)


@with_retry(max_retries=2, timeout=30.0)
def _call_claude_for_extraction(
    system_prompt: str, user_prompt: str, timeout: float = 30.0
):
    """Helper function to call Claude API for topic extraction with retry logic"""
    return client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        temperature=0.3,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=timeout,
    )


@with_retry(max_retries=2, timeout=90.0)
def _call_claude_for_generation(
    system_prompt: str, user_prompt: str, timeout: float = 90.0
):
    """Helper function to call Claude API for module generation with retry logic"""
    return client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8000,
        temperature=0.7,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=timeout,
    )


@with_retry(max_retries=2, timeout=60.0)
def _call_claude_for_evaluation(
    system_prompt: str, user_prompt: str, timeout: float = 60.0
):
    """Helper function to call Claude API for answer evaluation with retry logic"""
    return client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        temperature=0.5,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=timeout,
    )


def extract_topic_and_level(message: str) -> Dict[str, str]:
    """
    Extract topic and skill level from user's message using Claude API

    Args:
        message: User's message describing what they want to learn

    Returns:
        Dictionary containing topic and skill_level

    Raises:
        Exception: If extraction fails
    """
    # Use mock extraction if configured (for testing without API credits)
    if settings.USE_MOCK_CLAUDE:
        return extract_mock_topic_and_level(message)

    system_prompt = """You are an expert at understanding learning requests.
Extract the topic and skill level from the user's message.

Rules:
- Topic should be clear and specific (e.g., "Python basics", "Machine Learning", "Product Management")
- Skill level must be one of: beginner, intermediate, or advanced
- If skill level is not explicitly mentioned, infer it from context clues
- Default to "beginner" if uncertain about skill level

Return ONLY valid JSON matching this schema - no markdown, no code blocks:
{
  "topic": "string (the learning topic)",
  "skill_level": "beginner|intermediate|advanced"
}"""

    user_prompt = f"""Extract the topic and skill level from this message:

"{message}"

Return ONLY the JSON object."""

    try:
        response = _call_claude_for_extraction(system_prompt, user_prompt)

        # Extract the text content
        response_text = response.content[0].text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            start_idx = response_text.find("{")
            end_idx = response_text.rfind("}") + 1
            if start_idx != -1 and end_idx > start_idx:
                response_text = response_text[start_idx:end_idx]

        # Parse the JSON response
        extracted_data = json.loads(response_text)

        # Validate required fields
        if "topic" not in extracted_data or "skill_level" not in extracted_data:
            raise ValueError("Missing required fields in extraction")

        # Validate skill level
        valid_levels = ["beginner", "intermediate", "advanced"]
        if extracted_data["skill_level"] not in valid_levels:
            raise ValueError(f"Invalid skill level: {extracted_data['skill_level']}")

        return extracted_data

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse extraction response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Topic and level extraction failed: {str(e)}")


def generate_module(topic: str, skill_level: str, exercise_count: int = 3) -> Dict:
    """
    Generate a learning module using Claude API

    Args:
        topic: The learning topic
        skill_level: beginner, intermediate, or advanced
        exercise_count: Number of exercises to generate (1-5)

    Returns:
        Dictionary containing module data with title, domain, and exercises

    Raises:
        Exception: If module generation fails
    """

    # Use mock data if configured (for testing without API credits)
    if settings.USE_MOCK_CLAUDE:
        return generate_mock_module(topic, skill_level, exercise_count)

    system_prompt = """You are an expert instructional designer creating active learning exercises.

Requirements:
- Application-first: users learn by doing, not reading
- Realistic scenarios from the target domain
- Clear validation criteria (what makes an answer good vs. poor)
- Progressive difficulty within the module

Exercise types:
1. Analysis tasks: Present realistic material, ask user to identify/extract insights
2. Comparative evaluation: Give 3-4 options, ask user to rank and justify
3. Structured frameworks: Provide structure, ask user to apply to scenario

Each exercise must include:
- Clear prompt with scenario/context
- Any material needed (customer feedback, data, examples)
- Exactly 3 progressive hints (conceptual → specific → near-solution)
- Validation criteria (what makes an answer strong/weak)
- Model answer with detailed explanation

Return ONLY valid JSON matching this exact schema - no markdown, no code blocks, just the JSON:
{
  "title": "string (concise module title)",
  "domain": "string (lowercase_with_underscores like 'product_management')",
  "exercises": [
    {
      "sequence": 1,
      "name": "string (short descriptive name, 2-5 words)",
      "type": "analysis",
      "prompt": "string (clear task description)",
      "material": "string (content to analyze, required for analysis/framework)",
      "hints": ["hint1", "hint2", "hint3"],
      "validation_criteria": {
        "criterion1": "description",
        "criterion2": "description",
        "criterion3": "description"
      },
      "model_answer": "string (example answer)",
      "model_explanation": "string (why this answer is strong)",
      "estimated_minutes": 8
    },
    {
      "sequence": 2,
      "name": "string (short descriptive name, 2-5 words)",
      "type": "comparative",
      "prompt": "string (ranking task)",
      "options": ["option1", "option2", "option3"],
      "hints": ["hint1", "hint2", "hint3"],
      "validation_criteria": {
        "criterion1": "description",
        "criterion2": "description"
      },
      "model_answer": "string (ranking with justification)",
      "model_explanation": "string (why this ranking is strong)",
      "estimated_minutes": 7
    },
    {
      "sequence": 3,
      "name": "string (short descriptive name, 2-5 words)",
      "type": "framework",
      "prompt": "string (framework application task)",
      "material": "string (scenario to analyze)",
      "scaffold": {
        "element1": "prompt for element1",
        "element2": "prompt for element2"
      },
      "hints": ["hint1", "hint2", "hint3"],
      "validation_criteria": {
        "criterion1": "description",
        "criterion2": "description"
      },
      "model_answer": "string (completed framework)",
      "model_explanation": "string (why this application is strong)",
      "estimated_minutes": 10
    }
  ]
}"""

    user_prompt = f"""Create a {skill_level} learning module on: {topic}

Generate {exercise_count} exercises following this structure:

Exercise 1 (Analysis): Present realistic material, ask user to identify/extract insights
Exercise 2 (Comparative): Give 3-4 options, ask user to rank and justify
Exercise 3 (Framework): Provide structure, ask user to apply to scenario

For each exercise include:
1. A short descriptive name (2-5 words, e.g., "Analyzing Market Trends" or "Framework Application")
2. Clear prompt with scenario/context
3. Any material needed (customer feedback, data, examples)
4. Exactly 3 progressive hints (conceptual → specific → near-solution)
5. Validation criteria object with at least 2-4 criteria
6. Model answer with explanation of why it's strong

Ensure the topic is appropriate for {skill_level} level and exercises build on each other.

Return ONLY the JSON object, no markdown formatting or code blocks."""

    try:
        response = _call_claude_for_generation(system_prompt, user_prompt)

        # Extract the text content from the response
        response_text = response.content[0].text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            # Find the first { and last }
            start_idx = response_text.find("{")
            end_idx = response_text.rfind("}") + 1
            if start_idx != -1 and end_idx > start_idx:
                response_text = response_text[start_idx:end_idx]

        # Parse the JSON response
        module_data = json.loads(response_text)

        # Validate required fields
        if (
            "title" not in module_data
            or "domain" not in module_data
            or "exercises" not in module_data
        ):
            raise ValueError("Missing required fields in generated module")

        # Ensure exercises is a list and has the right count
        if not isinstance(module_data["exercises"], list):
            raise ValueError("Exercises must be a list")

        if len(module_data["exercises"]) != exercise_count:
            raise ValueError(
                f"Expected {exercise_count} exercises, got {len(module_data['exercises'])}"
            )

        # Add skill_level to the module data
        module_data["skill_level"] = skill_level

        return module_data

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse Claude response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Module generation failed: {str(e)}")


def evaluate_answer(exercise: Dict, answer_text: str, hints_used: int) -> Dict:
    """
    Evaluate a student's answer using Claude API

    Args:
        exercise: The exercise dictionary with prompt, validation criteria, etc.
        answer_text: The student's submitted answer
        hints_used: Number of hints the student used (0-3)

    Returns:
        Dictionary with assessment, internal_score, feedback, and should_advance

    Raises:
        Exception: If evaluation fails
    """

    # Use mock evaluation if configured (for testing without API credits)
    if settings.USE_MOCK_CLAUDE:
        return evaluate_mock_answer(exercise, answer_text, hints_used)

    system_prompt = """You are an expert learning instructor evaluating student responses.

Provide constructive, specific feedback that:
- Acknowledges what the student did well
- Identifies specific areas for improvement
- Connects feedback to the validation criteria
- Encourages growth mindset

Assessment levels:
- "strong": Meets all validation criteria, shows clear understanding (score 80-100)
- "developing": Partially meets criteria, shows emerging understanding (score 50-79)
- "needs_support": Does not meet criteria, needs more guidance (score 0-49)

Return ONLY valid JSON matching this schema - no markdown, no code blocks:
{
  "assessment": "strong|developing|needs_support",
  "internal_score": 85,
  "feedback": "Specific, constructive feedback...",
  "should_advance": true
}

Rules:
- should_advance is true only if assessment is "strong"
- Feedback should be 2-3 sentences
- Score must match assessment level
- Be encouraging but honest"""

    user_prompt = f"""Exercise Type: {exercise['type']}
Exercise Prompt: {exercise['prompt']}

Validation Criteria:
{json.dumps(exercise['validation_criteria'], indent=2)}

Model Answer: {exercise['model_answer']}
Model Explanation: {exercise['model_explanation']}

Student Answer:
{answer_text}

Hints Used: {hints_used}/3

Evaluate this answer against the validation criteria. Consider that using hints is okay - focus on understanding demonstrated.

Return ONLY the JSON evaluation object."""

    try:
        response = _call_claude_for_evaluation(system_prompt, user_prompt)

        # Extract the text content
        response_text = response.content[0].text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            start_idx = response_text.find("{")
            end_idx = response_text.rfind("}") + 1
            if start_idx != -1 and end_idx > start_idx:
                response_text = response_text[start_idx:end_idx]

        # Parse the JSON response
        evaluation = json.loads(response_text)

        # Validate required fields
        required_fields = ["assessment", "internal_score", "feedback", "should_advance"]
        if not all(field in evaluation for field in required_fields):
            raise ValueError("Missing required fields in evaluation")

        # Validate assessment values
        valid_assessments = ["strong", "developing", "needs_support"]
        if evaluation["assessment"] not in valid_assessments:
            raise ValueError(f"Invalid assessment value: {evaluation['assessment']}")

        # Validate score range
        if not (0 <= evaluation["internal_score"] <= 100):
            raise ValueError(
                f"Score must be between 0-100, got {evaluation['internal_score']}"
            )

        return evaluation

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse evaluation response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Answer evaluation failed: {str(e)}")
