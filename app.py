"""
Wellbeing-Companion — Flask App
A responsive web app for student health and wellbeing (SDG 3).
All user data stays in the browser via localStorage.
AI image analysis via Mistral Vision API (free tier available).
"""
import os
import json
import base64
from flask import Flask, render_template, send_from_directory, request, jsonify
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)
CORS(app)

# Mistral API client (OpenAI-compatible)
mistral = OpenAI(
    api_key=os.environ.get("MISTRAL_API_KEY", ""),
    base_url="https://api.mistral.ai/v1"
)

# ---- Prompts for each analysis type ----

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


@app.route('/')
def index():
    """Dashboard — wellness score, streaks, quick-add buttons."""
    return render_template('index.html')


@app.route('/mental-health')
def mental_health():
    """Mental health — mood logger, breathing exercise, crisis resources."""
    return render_template('mental-health.html')


@app.route('/physical-health')
def physical_health():
    """Physical health — activity logger, stretch break timer."""
    return render_template('physical-health.html')


@app.route('/nutrition')
def nutrition():
    """Nutrition — water tracker, meal logger."""
    return render_template('nutrition.html')


@app.route('/study-life')
def study_life():
    """Study-life balance — Pomodoro timer, study logger, break reminders."""
    return render_template('study-life.html')


@app.route('/gratitude')
def gratitude():
    return render_template('gratitude.html')


@app.route('/sleep')
def sleep():
    """Sleep tracker — log bedtime, wake time, quality."""
    return render_template('sleep.html')


@app.route('/auth')
def auth():
    """Authentication page — sign in / sign up."""
    return render_template('auth.html')


@app.route('/sw.js')
def service_worker():
    """Service worker must be served from root per PWA spec."""
    return send_from_directory('static', 'sw.js',
                               mimetype='application/javascript')


@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    """Analyze an image using Mistral Vision API (pixtral-12b).
    Accepts JSON: { image: "<base64 data URI>", type: "food"|"water"|"study" }
    Returns structured analysis as JSON.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    image_data_uri = data.get("image", "")
    analysis_type = data.get("type", "")

    if not image_data_uri or analysis_type not in PROMPTS:
        return jsonify({"error": "Missing image or invalid type"}), 400

    try:
        response = mistral.chat.completions.create(
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

        # Parse the JSON from the response (handle markdown code blocks)
        if raw.startswith("```"):
            lines = raw.split("\n")
            lines = lines[1:] if len(lines) > 1 else lines
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            raw = "\n".join(lines).strip()
            if raw.lower().startswith("json"):
                raw = raw[4:].strip()

        result = json.loads(raw)
        return jsonify(result)

    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse AI response", "raw": raw}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5555)
