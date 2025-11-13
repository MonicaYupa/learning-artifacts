"""
Claude API Service
Handles interactions with Claude API for module generation and answer evaluation
"""

import json
from typing import Dict, List

from anthropic import AsyncAnthropic
from config.constants import ClaudeConstants, RetryConstants
from config.settings import settings
from services.mock_data import (
    evaluate_mock_answer,
    extract_mock_topic_and_level,
    generate_mock_module,
)
from utils.retry_handler import with_retry

# Initialize Anthropic async client
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


def _extract_json_from_response(response_text: str) -> str:
    """
    Extract JSON from a response that may be wrapped in markdown code blocks

    Args:
        response_text: The raw response text from Claude

    Returns:
        Cleaned JSON string ready for parsing
    """
    response_text = response_text.strip()

    # Remove markdown code blocks if present
    if response_text.startswith("```"):
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}") + 1
        if start_idx != -1 and end_idx > start_idx:
            response_text = response_text[start_idx:end_idx]

    return response_text


@with_retry(
    max_retries=RetryConstants.MAX_RETRIES, timeout=ClaudeConstants.EXTRACTION_TIMEOUT
)
async def _call_claude_for_extraction(
    system_prompt: str,
    user_prompt: str,
    timeout: float = ClaudeConstants.EXTRACTION_TIMEOUT,
):
    """Helper function to call Claude API for topic extraction with retry logic"""
    return await client.messages.create(
        model=ClaudeConstants.MODEL,
        max_tokens=ClaudeConstants.EXTRACTION_MAX_TOKENS,
        temperature=ClaudeConstants.EXTRACTION_TEMPERATURE,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=timeout,
    )


@with_retry(
    max_retries=RetryConstants.MAX_RETRIES, timeout=ClaudeConstants.GENERATION_TIMEOUT
)
async def _call_claude_for_generation(
    system_prompt: str,
    user_prompt: str,
    timeout: float = ClaudeConstants.GENERATION_TIMEOUT,
):
    """Helper function to call Claude API for module generation with retry logic"""
    return await client.messages.create(
        model=ClaudeConstants.MODEL,
        max_tokens=ClaudeConstants.GENERATION_MAX_TOKENS,
        temperature=ClaudeConstants.GENERATION_TEMPERATURE,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=timeout,
    )


@with_retry(
    max_retries=RetryConstants.MAX_RETRIES, timeout=ClaudeConstants.EVALUATION_TIMEOUT
)
async def _call_claude_for_evaluation(
    system_prompt: str,
    user_prompt: str,
    timeout: float = ClaudeConstants.EVALUATION_TIMEOUT,
):
    """Helper function to call Claude API for answer evaluation with retry logic"""
    return await client.messages.create(
        model=ClaudeConstants.MODEL,
        max_tokens=ClaudeConstants.EVALUATION_MAX_TOKENS,
        temperature=ClaudeConstants.EVALUATION_TEMPERATURE,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=timeout,
    )


@with_retry(
    max_retries=RetryConstants.MAX_RETRIES, timeout=ClaudeConstants.GENERATION_TIMEOUT
)
async def _call_claude_for_hints(
    system_prompt: str,
    user_prompt: str,
    timeout: float = ClaudeConstants.GENERATION_TIMEOUT,
):
    """Helper function to call Claude API for hint generation with retry logic"""
    return await client.messages.create(
        model=ClaudeConstants.MODEL,
        max_tokens=ClaudeConstants.GENERATION_MAX_TOKENS,
        temperature=ClaudeConstants.GENERATION_TEMPERATURE,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=timeout,
    )


async def _call_claude_for_evaluation_stream(
    system_prompt: str,
    user_prompt: str,
    timeout: float = ClaudeConstants.EVALUATION_TIMEOUT,
):
    """Helper function to call Claude API for answer evaluation with streaming"""
    return await client.messages.create(
        model=ClaudeConstants.MODEL,
        max_tokens=ClaudeConstants.EVALUATION_MAX_TOKENS,
        temperature=ClaudeConstants.EVALUATION_TEMPERATURE,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=timeout,
        stream=True,
    )


async def extract_topic_and_level(message: str) -> Dict[str, str]:
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
        response = await _call_claude_for_extraction(system_prompt, user_prompt)

        # Extract and clean the response text
        response_text = _extract_json_from_response(response.content[0].text)

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


async def generate_module(
    topic: str, skill_level: str, exercise_count: int = 3
) -> Dict:
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
- Progressive difficulty within the module

Exercise types:
1. Analysis tasks: Present realistic material, ask user to identify/extract insights
2. Comparative evaluation: Give 3-4 options, ask user to rank and justify
3. Structured frameworks: Provide structure, ask user to apply to scenario

Each exercise must include:
- Clear prompt with scenario/context
- Any material needed (customer feedback, data, examples)

Return ONLY valid JSON matching this exact schema - no markdown, no code blocks, just the JSON:
{
  "title": "string (concise, engaging module title)",
  "domain": "string (lowercase_with_underscores like 'product_management')",
  "exercises": [
    {
      "sequence": 1,
      "name": "string (short descriptive name, 2-5 words)",
      "type": "analysis",
      "prompt": "string (clear task description)",
      "material": "string (content to analyze, required for analysis/framework)",
      "estimated_minutes": 8
    },
    {
      "sequence": 2,
      "name": "string (short descriptive name, 2-5 words)",
      "type": "comparative",
      "prompt": "string (ranking task)",
      "options": ["option1", "option2", "option3"],
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

Ensure the topic is appropriate for {skill_level} level and exercises build on each other.

Return ONLY the JSON object, no markdown formatting or code blocks."""

    try:
        response = await _call_claude_for_generation(system_prompt, user_prompt)

        # Extract and clean the response text
        response_text = _extract_json_from_response(response.content[0].text)

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


async def evaluate_answer(exercise: Dict, answer_text: str) -> Dict:
    """
    Evaluate a student's answer using Claude API

    Args:
        exercise: The exercise dictionary with prompt
        answer_text: The student's submitted answer

    Returns:
        Dictionary with assessment, internal_score, and feedback

    Raises:
        Exception: If evaluation fails
    """

    # Use mock evaluation if configured (for testing without API credits)
    if settings.USE_MOCK_CLAUDE:
        return evaluate_mock_answer()

    system_prompt = """You are an expert learning instructor evaluating student responses.

Provide constructive, specific feedback that:
- Acknowledges what the student did well
- Identifies specific areas for improvement
- Encourages growth mindset

Assessment levels:
- "strong": Shows clear understanding and application of concepts (score 80-100)
- "developing": Shows emerging understanding, could use more depth or clarity (score 50-79)
- "beginning": Shows misunderstanding or lacks key elements, needs more guidance (score 0-49)

Return ONLY valid JSON matching this schema - no markdown, no code blocks:
{
  "assessment": "strong|developing|beginning",
  "internal_score": 85,
  "feedback": "Specific, constructive feedback..."
}

Rules:
- Feedback should be 2-3 sentences
- Score must match assessment level
- Be encouraging but honest"""

    user_prompt = f"""Exercise Type: {exercise['type']}
Exercise Prompt: {exercise['prompt']}

Learner Answer:
{answer_text}

Evaluate this answer based on whether it demonstrates understanding of the concepts and appropriately addresses the exercise prompt. Focus on understanding demonstrated.

Return ONLY the JSON evaluation object."""

    try:
        response = await _call_claude_for_evaluation(system_prompt, user_prompt)

        # Extract and clean the response text
        response_text = _extract_json_from_response(response.content[0].text)

        # Parse the JSON response
        evaluation = json.loads(response_text)

        # Validate required fields
        required_fields = ["assessment", "internal_score", "feedback"]
        if not all(field in evaluation for field in required_fields):
            raise ValueError("Missing required fields in evaluation")

        # Validate assessment values
        valid_assessments = ["strong", "developing", "beginning"]
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


async def evaluate_answer_stream(exercise: Dict, answer_text: str):
    """
    Evaluate a student's answer using Claude API with streaming

    Yields Server-Sent Events (SSE) formatted data chunks:
    - data: {"type": "content", "text": "..."} for feedback chunks
    - data: {"type": "complete", "assessment": "...", "internal_score": ..., "feedback": "..."} when done

    Args:
        exercise: The exercise dictionary with prompt
        answer_text: The student's submitted answer

    Yields:
        str: SSE formatted data chunks

    Raises:
        Exception: If evaluation fails
    """
    # Use mock evaluation if configured (for testing without API credits)
    if settings.USE_MOCK_CLAUDE:
        # For mock mode, just return the result immediately
        result = evaluate_mock_answer()
        # Simulate streaming by yielding the feedback in chunks
        feedback_text = result["feedback"]
        chunk_size = 10
        for i in range(0, len(feedback_text), chunk_size):
            chunk = feedback_text[i : i + chunk_size]
            yield f"data: {json.dumps({'type': 'content', 'text': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'complete', **result})}\n\n"
        return

    system_prompt = """You are an expert learning instructor evaluating student responses.

Provide constructive, specific feedback that:
- Acknowledges what the student did well
- Identifies specific areas for improvement
- Encourages growth mindset

Assessment levels:
- "strong": Shows clear understanding and application of concepts (score 80-100)
- "developing": Shows emerging understanding, could use more depth or clarity (score 50-79)
- "beginning": Shows misunderstanding or lacks key elements, needs more guidance (score 0-49)

Return ONLY valid JSON matching this schema - no markdown, no code blocks:
{
  "assessment": "strong|developing|beginning",
  "internal_score": 85,
  "feedback": "Specific, constructive feedback..."
}

Rules:
- Feedback should be 2-3 sentences
- Score must match assessment level
- Be encouraging but honest"""

    user_prompt = f"""Exercise Type: {exercise['type']}
Exercise Prompt: {exercise['prompt']}

Student Answer:
{answer_text}

Evaluate this answer based on whether it demonstrates understanding of the concepts and appropriately addresses the exercise prompt. Focus on understanding demonstrated.

Return ONLY the JSON evaluation object."""

    try:
        # Call Claude API with streaming
        stream = await _call_claude_for_evaluation_stream(system_prompt, user_prompt)

        response_text = ""
        feedback_buffer = ""
        inside_feedback = False
        escape_next = False

        # Process the stream
        async for event in stream:
            if event.type == "content_block_delta":
                if hasattr(event.delta, "text"):
                    text_chunk = event.delta.text
                    response_text += text_chunk

                    # Parse incrementally to extract only feedback text
                    for char in text_chunk:
                        # Check if we're entering the feedback field
                        if not inside_feedback:
                            # Look for "feedback": " pattern
                            feedback_buffer += char
                            if (
                                '"feedback"' in feedback_buffer
                                and char == '"'
                                and feedback_buffer.endswith('": "')
                            ):
                                inside_feedback = True
                                feedback_buffer = ""
                        else:
                            # We're inside the feedback field, stream the content
                            if escape_next:
                                # This character is escaped, include it literally
                                yield f"data: {json.dumps({'type': 'content', 'text': char})}\n\n"
                                escape_next = False
                            elif char == "\\":
                                # Next character is escaped
                                escape_next = True
                            elif char == '"':
                                # End of feedback field
                                inside_feedback = False
                                feedback_buffer = ""
                            else:
                                # Regular feedback text character
                                yield f"data: {json.dumps({'type': 'content', 'text': char})}\n\n"

        # Stream is complete, extract and clean the response text
        response_text = _extract_json_from_response(response_text)

        # Parse the JSON response
        evaluation = json.loads(response_text)

        # Validate required fields
        required_fields = ["assessment", "internal_score", "feedback"]
        if not all(field in evaluation for field in required_fields):
            raise ValueError("Missing required fields in evaluation")

        # Validate assessment values
        valid_assessments = ["strong", "developing", "beginning"]
        if evaluation["assessment"] not in valid_assessments:
            raise ValueError(f"Invalid assessment value: {evaluation['assessment']}")

        # Validate score range
        if not (0 <= evaluation["internal_score"] <= 100):
            raise ValueError(
                f"Score must be between 0-100, got {evaluation['internal_score']}"
            )

        # Send the complete evaluation
        yield f"data: {json.dumps({'type': 'complete', **evaluation})}\n\n"

    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse evaluation response as JSON: {str(e)}"
        yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
    except Exception as e:
        error_msg = f"Answer evaluation failed: {str(e)}"
        yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"


async def generate_single_hint(
    exercise: Dict, hint_level: int, previous_hints: List[str]
) -> str:
    """
    Generate a single progressive hint for an exercise based on the hint level

    Args:
        exercise: The exercise dictionary with prompt and context
        hint_level: The level of hint to generate (1, 2, or 3)
        previous_hints: List of previously generated hints for context

    Returns:
        A single hint string appropriate for the requested level

    Raises:
        Exception: If hint generation fails
    """
    # Use mock hints if configured (for testing without API credits)
    if settings.USE_MOCK_CLAUDE:
        mock_hints = [
            "Consider the key concepts involved in this type of task.",
            "Think about specific approaches or frameworks that apply here.",
            "Break down the problem into smaller steps and address each one.",
        ]
        return mock_hints[hint_level - 1]

    # Define hint level descriptions
    hint_descriptions = {
        1: "Hint 1 (Conceptual): Point to relevant concepts or frameworks to consider",
        2: "Hint 2 (Specific): Highlight specific aspects or elements to focus on",
        3: "Hint 3 (Near-solution): Provide structure or direction that's close to the solution path",
    }

    system_prompt = f"""You are an expert learning instructor creating a progressive hint.

Generate hint level {hint_level} of 3 for this exercise:
{hint_descriptions[hint_level]}

Return ONLY valid JSON matching this schema - no markdown, no code blocks:
{{
  "hint": "your hint text here"
}}

Rules:
- The hint should be 1-2 sentences
- Build upon previous hints to provide progressive guidance
- Don't give away the answer directly
- Make this hint more specific/helpful than previous hints"""

    # Build context based on exercise type
    context_parts = [
        f"Exercise Type: {exercise['type']}",
        f"Prompt: {exercise['prompt']}",
    ]

    if "material" in exercise and exercise["material"]:
        material_preview = exercise["material"][:200]
        context_parts.append(f"Material provided: {material_preview}...")

    if "options" in exercise and exercise["options"]:
        options_str = ", ".join(exercise["options"])
        context_parts.append(f"Options to consider: {options_str}")

    if "scaffold" in exercise and exercise["scaffold"]:
        scaffold_keys = list(exercise["scaffold"].keys())
        context_parts.append(f"Framework structure: {scaffold_keys}")

    # Add previous hints for context
    if previous_hints:
        context_parts.append("\nPreviously provided hints:")
        for i, hint in enumerate(previous_hints, 1):
            context_parts.append(f"Hint {i}: {hint}")

    user_prompt = f"""{chr(10).join(context_parts)}

Generate hint level {hint_level} that helps a learner work through this exercise.
This hint should be more specific and helpful than the previous hints.

Return ONLY the JSON object with the hint text."""

    try:
        response = await _call_claude_for_hints(system_prompt, user_prompt)

        # Extract and clean the response text
        response_text = _extract_json_from_response(response.content[0].text)

        # Parse the JSON response
        hint_data = json.loads(response_text)

        # Validate hint
        if "hint" not in hint_data or not isinstance(hint_data["hint"], str):
            raise ValueError("Invalid hint format in response")

        return hint_data["hint"]

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse hint response as JSON: {str(e)}")
    except Exception as e:
        raise Exception(f"Hint generation failed: {str(e)}")
