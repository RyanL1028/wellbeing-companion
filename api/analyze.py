"""
Vercel Serverless Function — AI Image Analysis
POST /api/analyze — Mistral Vision API (pixtral-12b), free tier.
"""
import os
import json
from openai import OpenAI

PROMPTS = {
    "food": (
        "Analyze this food photo and estimate its nutritional content. "
        "Return ONLY valid JSON (no markdown, no extra text) in this exact format:\n"
        '{"name":"...","calories":000,"protein_g":00,"carbs_g":00,"fat_g":00,"healthScore":0,"description":"..."}\n'
        "healthScore is 1-5 (1=unhealthy, 5=very healthy). Be realistic with estimates."
    ),
    "water": (
        "Look at this photo and count how many cups/glasses/bottles of water are visible. "
        "Return ONLY valid JSON (no markdown, no extra text) in this exact format:\n"
        '{"cupsCount":0,"totalMl":000,"description":"..."}\n'
        "Estimate 250ml per standard cup. Count ALL drinking vessels containing clear liquid."
    ),
    "study": (
        "Look at this photo and determine if the person is in a study/work environment. "
        "Return ONLY valid JSON (no markdown, no extra text) in this exact format:\n"
        '{"studying":true,"confidence":0.0,"description":"...","suggestions":["..."]}\n'
        "confidence is 0.0-1.0. If studying, provide 1-2 brief tips. If not, describe what you see."
    ),
}

client = OpenAI(
    api_key=os.environ.get("MISTRAL_API_KEY", ""),
    base_url="https://api.mistral.ai/v1"
)


def handler(request):
    """Vercel Python HTTP handler."""
    # CORS preflight
    if request.get("method") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
            },
            "body": ""
        }

    try:
        body = json.loads(request.get("body", "{}"))
    except json.JSONDecodeError:
        return _cors(400, {"error": "Invalid JSON"})

    image_data_uri = body.get("image", "")
    analysis_type = body.get("type", "")

    if analysis_type not in PROMPTS:
        return _cors(400, {"error": "Missing image or invalid type (use: food, water, study)"})

    if not image_data_uri:
        return _cors(400, {"error": "Missing image"})

    try:
        response = client.chat.completions.create(
            model="pixtral-12b-2409",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPTS[analysis_type]},
                    {"type": "image_url", "image_url": {"url": image_data_uri}}
                ]
            }],
            max_tokens=500,
            temperature=0.1
        )

        raw = response.choices[0].message.content.strip()

        # Parse JSON (handle markdown code blocks)
        if raw.startswith("```"):
            lines = raw.split("\n")
            lines = lines[1:] if len(lines) > 1 else lines
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            raw = "\n".join(lines).strip()
            if raw.lower().startswith("json"):
                raw = raw[4:].strip()

        result = json.loads(raw)
        return _cors(200, result)

    except json.JSONDecodeError:
        return _cors(500, {"error": "Failed to parse AI response", "raw": raw})
    except Exception as e:
        return _cors(500, {"error": str(e)})


def _cors(status, data):
    return {
        "statusCode": status,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        "body": json.dumps(data)
    }
