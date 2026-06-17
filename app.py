"""
Wellbeing-Companion — Flask App
A responsive web app for student health and wellbeing (SDG 3).
All user data stays in the browser via localStorage.
"""
from flask import Flask, render_template, send_from_directory

app = Flask(__name__)


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


@app.route('/auth')
def auth():
    """Authentication page — sign in / sign up."""
    return render_template('auth.html')


@app.route('/sw.js')
def service_worker():
    """Service worker must be served from root per PWA spec."""
    return send_from_directory('static', 'sw.js',
                               mimetype='application/javascript')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5555)
