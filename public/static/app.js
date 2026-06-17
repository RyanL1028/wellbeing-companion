/**
 * Wellbeing-Companion — Main Application
 * Page namespace pattern: each page's logic lives in a namespaced object.
 * On DOMContentLoaded, the page router reads <body data-page="...">
 * and calls the appropriate init function.
 */

// ---- Shared Utilities ----

var Util = {
    /** Format a date string as "Mon, Jun 11" */
    formatDate: function(dateStr) {
        var d = new Date(dateStr + 'T00:00:00');
        var opts = { weekday: 'short', month: 'short', day: 'numeric' };
        return d.toLocaleDateString('en-US', opts);
    },

    /** Get today's date as YYYY-MM-DD */
    today: function() {
        return new Date().toISOString().split('T')[0];
    },

    /** Show a feedback message for a few seconds */
    showFeedback: function(el, msg, type) {
        el.textContent = msg;
        el.className = 'feedback-msg ' + (type || 'success');
        el.style.display = 'block';
        setTimeout(function() {
            el.style.display = 'none';
        }, 2500);
    },

    /** Animate a number from start to end */
    animateNumber: function(el, start, end, duration) {
        var range = end - start;
        var startTime = null;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            el.textContent = Math.round(start + range * progress);
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }
};


// ---- Page Namespace ----

var page = {

    // ================================================
    // Dashboard
    // ================================================
    dashboard: {
        _ready: false,
        init: function() {
            if (this._ready) return;
            this._ready = true;
            this.renderWellnessScore();
            this.renderStreaks();
            this.initQuickAdds();
            this.showDailyTip();
        },

        renderWellnessScore: function() {
            var score = this.computeScore();
            var el = document.getElementById('wellness-score');
            if (!el) return;

            // Animate the score number
            Util.animateNumber(el, 0, score, 800);

            // Animate the ring
            var circle = document.getElementById('ring-circle');
            if (circle) {
                var circumference = 2 * Math.PI * 52; // r=52
                var offset = circumference - (score / 100) * circumference;
                circle.style.strokeDasharray = circumference;
                circle.style.strokeDashoffset = circumference;
                // Trigger animation
                setTimeout(function() {
                    circle.style.strokeDashoffset = offset;
                }, 100);
            }
        },

        computeScore: function() {
            // Composite score from 4 areas (each 0-25 points)
            var score = 0;

            // Mood: logged today? (25 pts for any mood logged)
            var moods = Storage.getMoods();
            var today = Util.today();
            var todayMood = moods.filter(function(m) { return m.date === today; });
            if (todayMood.length > 0) {
                score += 25;
            }

            // Water: proportional to goal (25 pts for hitting goal)
            var waterGlasses = Storage.getWaterGlasses(Storage._todayKey());
            var waterGoal = Storage.getGoals().waterTarget;
            score += Math.min(25, Math.round((waterGlasses / waterGoal) * 25));

            // Activity: proportional to goal (25 pts for hitting goal)
            var activities = Storage.getActivities();
            var todayMinutes = activities
                .filter(function(a) { return a.date === today; })
                .reduce(function(sum, a) { return sum + a.minutes; }, 0);
            var activityGoal = Storage.getGoals().activityTarget;
            score += Math.min(25, Math.round((todayMinutes / activityGoal) * 25));

            // Study: proportional to goal (25 pts for hitting goal)
            var sessions = Storage.getStudySessions();
            var todayStudy = sessions
                .filter(function(s) { return s.date === today; })
                .reduce(function(sum, s) { return sum + s.minutes; }, 0);
            var studyGoal = Storage.getGoals().studyTarget;
            score += Math.min(25, Math.round((todayStudy / studyGoal) * 25));

            return Math.min(100, score);
        },

        renderStreaks: function() {
            var moodStreak = Storage.getMoodStreak();
            var waterStreak = Storage.getWaterStreak();
            var activityStreak = Storage.getActivityStreak();
            var studyStreak = Storage.getStudyStreak();

            var moodEl = document.getElementById('streak-mood');
            var waterEl = document.getElementById('streak-water');
            var activityEl = document.getElementById('streak-activity');
            var studyEl = document.getElementById('streak-study');

            if (moodEl) Util.animateNumber(moodEl, 0, moodStreak, 600);
            if (waterEl) Util.animateNumber(waterEl, 0, waterStreak, 600);
            if (activityEl) Util.animateNumber(activityEl, 0, activityStreak, 600);
            if (studyEl) Util.animateNumber(studyEl, 0, studyStreak, 600);
        },

        initQuickAdds: function() {
            var self = this;

            // Mood quick-add
            document.getElementById('quick-mood').addEventListener('click', function() {
                self.toggleForm('quick-mood-form');
            });
            var moodPicker = document.getElementById('quick-mood-picker');
            if (moodPicker) {
                moodPicker.addEventListener('click', function(e) {
                    var btn = e.target.closest('.mood-btn');
                    if (!btn) return;
                    var mood = parseInt(btn.dataset.mood);
                    Storage.addMood(mood, '');
                    document.getElementById('quick-mood-form').style.display = 'none';
                    self.renderWellnessScore();
                    self.renderStreaks();
                });
            }

            // Water quick-add
            document.getElementById('quick-water').addEventListener('click', function() {
                self.toggleForm('quick-water-form');
            });
            var waterCount = document.getElementById('quick-water-count');
            document.querySelector('#quick-water-form .water-minus').addEventListener('click', function() {
                var v = parseInt(waterCount.textContent);
                if (v > 1) waterCount.textContent = v - 1;
            });
            document.querySelector('#quick-water-form .water-plus').addEventListener('click', function() {
                var v = parseInt(waterCount.textContent);
                if (v < 8) waterCount.textContent = v + 1;
            });
            document.getElementById('quick-water-save').addEventListener('click', function() {
                var count = parseInt(waterCount.textContent);
                for (var i = 0; i < count; i++) {
                    Storage.fillWaterGlass();
                }
                document.getElementById('quick-water-form').style.display = 'none';
                self.renderWellnessScore();
                self.renderStreaks();
            });

            // Activity quick-add
            document.getElementById('quick-activity').addEventListener('click', function() {
                self.toggleForm('quick-activity-form');
            });
            document.getElementById('quick-activity-save').addEventListener('click', function() {
                var type = document.getElementById('quick-activity-type').value;
                var minutes = parseInt(document.getElementById('quick-activity-minutes').value) || 30;
                Storage.addActivity(type, minutes);
                document.getElementById('quick-activity-form').style.display = 'none';
                self.renderWellnessScore();
                self.renderStreaks();
            });
        },

        toggleForm: function(formId) {
            var forms = ['quick-mood-form', 'quick-water-form', 'quick-activity-form'];
            forms.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) {
                    el.style.display = (id === formId && el.style.display === 'none') ? 'block' : 'none';
                }
            });
        },

        showDailyTip: function() {
            var tips = [
                'Take a 5-minute walk between study sessions to refresh your mind.',
                'Drink a glass of water before your morning coffee or tea.',
                'Try the 20-20-20 rule: every 20 min, look 20 feet away for 20 seconds.',
                'Aim for 7-9 hours of sleep — your brain consolidates memories during sleep.',
                'Eating protein-rich breakfasts helps maintain focus throughout the morning.',
                'Stretching for just 5 minutes can reduce tension from sitting at a desk.',
                'Practice gratitude: write down 3 things you\'re grateful for today.',
                'Deep breathing activates your parasympathetic nervous system — it calms you down.',
                'Social connections are vital for mental health. Reach out to a friend today.',
                'Limit screen time 1 hour before bed for better sleep quality.'
            ];
            var tip = tips[Math.floor(Math.random() * tips.length)];

            var tipSection = document.querySelector('.page-section');
            if (tipSection) {
                var tipEl = document.createElement('div');
                tipEl.className = 'wellness-tip';
                tipEl.innerHTML = '<div class="tip-label">💡 Daily Wellness Tip</div>' +
                                  '<div class="tip-text">' + tip + '</div>';
                tipSection.appendChild(tipEl);
            }
        }
    },

    // ================================================
    // Mental Health
    // ================================================
    mental: {
        breathingTimer: null,
        breathingPhase: 0, // 0=inhale, 1=hold, 2=exhale
        breathingSeconds: 0,
        isBreathing: false,
        _ready: false,

        init: function() {
            if (this._ready) return;
            this._ready = true;
            this.initMoodPicker();
            this.renderMoodHistory();
            this.initBreathing();
            this.initCrisisToggle();
        },

        initMoodPicker: function() {
            var self = this;
            var picker = document.getElementById('mood-picker');
            if (!picker) return;

            picker.addEventListener('click', function(e) {
                var btn = e.target.closest('.mood-btn');
                if (!btn) return;
                var mood = parseInt(btn.dataset.mood);

                // Highlight selection
                picker.querySelectorAll('.mood-btn').forEach(function(b) {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');

                // Save
                var note = document.getElementById('mood-note').value;
                Storage.addMood(mood, note);

                // Show feedback
                var moods = ['', '😢', '😟', '😐', '😊', '🤩'];
                var fb = document.getElementById('mood-feedback');
                Util.showFeedback(fb, 'Mood logged: ' + moods[mood] + ' — take care!', 'success');

                // Clear
                document.getElementById('mood-note').value = '';
                self.renderMoodHistory();
            });
        },

        renderMoodHistory: function() {
            var moods = Storage.getMoods();
            var dots = document.getElementById('mood-dots');
            if (!dots) return;

            var moodEmojis = ['', '😢', '😟', '😐', '😊', '🤩'];
            var today = Util.today();
            var todayFound = false;

            // Build map of date → mood (latest of each day)
            var dailyMap = {};
            moods.forEach(function(m) {
                dailyMap[m.date] = m.mood;
            });

            // Get last 7 days
            var html = '';
            var d = new Date();
            for (var i = 6; i >= 0; i--) {
                var date = new Date(d);
                date.setDate(date.getDate() - i);
                var key = date.toISOString().split('T')[0];
                var mood = dailyMap[key];
                var isToday = key === today;

                if (mood) {
                    html += '<span class="mood-dot' + (isToday ? ' today' : '') + '">' +
                            moodEmojis[mood] + '</span>';
                    if (isToday) todayFound = true;
                } else {
                    html += '<span class="mood-dot' + (isToday ? ' today' : '') + '">-</span>';
                }
            }
            dots.innerHTML = html;
        },

        initBreathing: function() {
            var self = this;
            var circle = document.getElementById('breathing-circle');
            var phaseEl = document.getElementById('breathing-phase');
            var timerEl = document.getElementById('breathing-timer');

            document.getElementById('breathing-start').addEventListener('click', function() {
                self.startBreathing(circle, phaseEl, timerEl);
            });

            document.getElementById('breathing-stop').addEventListener('click', function() {
                self.stopBreathing(circle, phaseEl, timerEl);
            });
        },

        startBreathing: function(circle, phaseEl, timerEl) {
            var self = this;
            this.isBreathing = true;
            this.breathingPhase = 0;
            this.breathingSeconds = 4; // Start with inhale (4 seconds)

            document.getElementById('breathing-start').style.display = 'none';
            document.getElementById('breathing-stop').style.display = 'inline-flex';

            this._runBreathCycle(circle, phaseEl, timerEl);
        },

        _runBreathCycle: function(circle, phaseEl, timerEl) {
            var self = this;
            if (!this.isBreathing) return;

            var phaseDurations = [4, 7, 8]; // inhale, hold, exhale
            var phaseNames = ['Inhale', 'Hold', 'Exhale'];
            var phaseClasses = ['inhale', 'hold', 'exhale'];

            var duration = phaseDurations[this.breathingPhase];
            var name = phaseNames[this.breathingPhase];
            var cls = phaseClasses[this.breathingPhase];
            this.breathingSeconds = duration;

            // Update UI
            circle.className = 'breathing-circle ' + cls;
            phaseEl.textContent = name;
            timerEl.textContent = '0:' + String(duration).padStart(2, '0');

            var startTime = Date.now();

            var tick = function() {
                if (!self.isBreathing) return;

                var elapsed = Math.floor((Date.now() - startTime) / 1000);
                var remaining = duration - elapsed;

                if (remaining <= 0) {
                    // Move to next phase
                    self.breathingPhase = (self.breathingPhase + 1) % 3;
                    self._runBreathCycle(circle, phaseEl, timerEl);
                } else {
                    timerEl.textContent = '0:' + String(remaining).padStart(2, '0');
                    self.breathingTimer = setTimeout(tick, 200);
                }
            };

            this.breathingTimer = setTimeout(tick, 200);
        },

        stopBreathing: function(circle, phaseEl, timerEl) {
            this.isBreathing = false;
            clearTimeout(this.breathingTimer);

            circle.className = 'breathing-circle';
            phaseEl.textContent = 'Ready';
            timerEl.textContent = '00:00';

            document.getElementById('breathing-start').style.display = 'inline-flex';
            document.getElementById('breathing-stop').style.display = 'none';
        },

        initCrisisToggle: function() {
            var toggle = document.getElementById('crisis-toggle');
            var resources = document.getElementById('crisis-resources');
            if (!toggle || !resources) return;

            toggle.addEventListener('click', function() {
                var isVisible = resources.style.display !== 'none';
                resources.style.display = isVisible ? 'none' : 'block';
                toggle.querySelector('span').textContent = isVisible ? '🆘' : '🆘';
                toggle.classList.toggle('active', !isVisible);
            });
        }
    },

    // ================================================
    // Physical Health
    // ================================================
    physical: {
        stretchTimer: null,
        stretchSeconds: 300, // 5 minutes
        stretchRunning: false,
        _ready: false,

        init: function() {
            if (this._ready) return;
            this._ready = true;
            this.initActivityLogger();
            this.renderActivitySummary();
            this.initStretchTimer();
        },

        initActivityLogger: function() {
            var self = this;
            document.getElementById('activity-save').addEventListener('click', function() {
                var type = document.getElementById('activity-type').value;
                var minutes = parseInt(document.getElementById('activity-minutes').value);

                if (!minutes || minutes < 1 || minutes > 300) {
                    var fb = document.getElementById('activity-feedback');
                    Util.showFeedback(fb, 'Please enter 1-300 minutes.', 'error');
                    return;
                }

                Storage.addActivity(type, minutes);
                var fb = document.getElementById('activity-feedback');
                Util.showFeedback(fb, 'Logged ' + minutes + ' min of activity! 🎉', 'success');

                document.getElementById('activity-minutes').value = 30;
                self.renderActivitySummary();
            });
        },

        renderActivitySummary: function() {
            var activities = Storage.getActivities();
            var today = Util.today();
            var todayActs = activities.filter(function(a) { return a.date === today; });
            var totalMinutes = todayActs.reduce(function(sum, a) { return sum + a.minutes; }, 0);
            var goal = Storage.getGoals().activityTarget;

            // Progress bar
            var bar = document.getElementById('activity-bar');
            if (bar) {
                var pct = Math.min(100, Math.round((totalMinutes / goal) * 100));
                bar.style.width = pct + '%';
            }

            // Progress text
            var text = document.getElementById('activity-progress-text');
            if (text) {
                text.textContent = totalMinutes + ' / ' + goal + ' minutes goal';
            }

            // Activity list
            var list = document.getElementById('activity-list');
            if (!list) return;

            if (todayActs.length === 0) {
                list.innerHTML = '<li class="log-empty">No activities logged yet today.</li>';
                return;
            }

            var icons = {
                walk: '🚶', run: '🏃', gym: '🏋️', sport: '⚽',
                yoga: '🧘', swim: '🏊', dance: '💃', other: '💪'
            };
            var html = '';
            todayActs.forEach(function(a) {
                html += '<li>' +
                    '<span class="log-item-left">' +
                    '<span class="log-item-icon">' + (icons[a.type] || '💪') + '</span>' +
                    '<span>' + a.type.charAt(0).toUpperCase() + a.type.slice(1) + '</span>' +
                    '</span>' +
                    '<span>' + a.minutes + ' min</span>' +
                    '</li>';
            });
            list.innerHTML = html;
        },

        initStretchTimer: function() {
            var self = this;
            var display = document.getElementById('stretch-timer-display');
            var stateEl = document.getElementById('stretch-state');

            document.getElementById('stretch-start').addEventListener('click', function() {
                if (self.stretchRunning) return;
                self.stretchRunning = true;
                self.stretchSeconds = 300;
                stateEl.textContent = 'Stretch time! Follow the exercises below.';

                self.stretchTimer = setInterval(function() {
                    self.stretchSeconds--;
                    var mins = Math.floor(self.stretchSeconds / 60);
                    var secs = self.stretchSeconds % 60;
                    display.textContent = String(mins).padStart(2, '0') + ':' +
                                          String(secs).padStart(2, '0');

                    if (self.stretchSeconds <= 0) {
                        clearInterval(self.stretchTimer);
                        self.stretchRunning = false;
                        display.textContent = '05:00';
                        stateEl.textContent = 'Great job! Time to get back to work. 💪';
                        // Vibrate if supported
                        if (navigator.vibrate) {
                            navigator.vibrate([200, 100, 200]);
                        }
                    }
                }, 1000);
            });

            document.getElementById('stretch-reset').addEventListener('click', function() {
                clearInterval(self.stretchTimer);
                self.stretchRunning = false;
                self.stretchSeconds = 300;
                display.textContent = '05:00';
                stateEl.textContent = 'Ready to stretch?';
            });
        }
    },

    // ================================================
    // Nutrition
    // ================================================
    nutrition: {
        selectedRating: 3,
        _ready: false,

        init: function() {
            if (this._ready) return;
            this._ready = true;
            this.renderWaterGlasses();
            this.initWaterClick();
            this.initRatingPicker();
            this.initMealLogger();
            this.renderMeals();
        },

        renderWaterGlasses: function() {
            var count = Storage.getWaterGlasses(Storage._todayKey());
            var glasses = document.querySelectorAll('.glass-icon');
            glasses.forEach(function(g, i) {
                if (i < count) {
                    g.textContent = '💧';
                    g.classList.add('filled');
                } else {
                    g.textContent = '🫙';
                    g.classList.remove('filled');
                }
            });
            var text = document.getElementById('water-count-text');
            if (text) {
                var goal = Storage.getGoals().waterTarget;
                text.textContent = count + ' / ' + goal + ' glasses today';
            }
        },

        initWaterClick: function() {
            var self = this;
            var glasses = document.getElementById('water-glasses');
            if (!glasses) return;

            glasses.addEventListener('click', function(e) {
                var btn = e.target.closest('.glass-icon');
                if (!btn) return;
                var index = parseInt(btn.dataset.index);
                var current = Storage.getWaterGlasses(Storage._todayKey());

                if (index < current) {
                    // Undo: unfill glasses from this point
                    var toRemove = current - index;
                    for (var i = 0; i < toRemove; i++) {
                        Storage.unfillWaterGlass();
                    }
                } else {
                    // Fill up to this glass
                    var toAdd = index - current + 1;
                    for (var j = 0; j < toAdd; j++) {
                        Storage.fillWaterGlass();
                    }
                }
                self.renderWaterGlasses();
            });

            document.getElementById('water-reset').addEventListener('click', function() {
                if (confirm('Reset today\'s water count to 0?')) {
                    Storage.resetWater();
                    self.renderWaterGlasses();
                }
            });
        },

        initRatingPicker: function() {
            var self = this;
            var picker = document.getElementById('meal-rating-picker');
            if (!picker) return;

            // Select default
            picker.querySelector('.rating-btn[data-rating="3"]').classList.add('selected');

            picker.addEventListener('click', function(e) {
                var btn = e.target.closest('.rating-btn');
                if (!btn) return;
                picker.querySelectorAll('.rating-btn').forEach(function(b) {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');
                self.selectedRating = parseInt(btn.dataset.rating);
                document.getElementById('meal-rating').value = self.selectedRating;
            });
        },

        initMealLogger: function() {
            var self = this;
            document.getElementById('meal-save').addEventListener('click', function() {
                var type = document.getElementById('meal-type').value;
                var desc = document.getElementById('meal-description').value.trim();

                if (!desc) {
                    var fb = document.getElementById('meal-feedback');
                    Util.showFeedback(fb, 'Please describe your meal.', 'error');
                    return;
                }

                Storage.addMeal(type, desc, self.selectedRating);
                var fb = document.getElementById('meal-feedback');
                Util.showFeedback(fb, 'Meal logged! 🍽️', 'success');

                document.getElementById('meal-description').value = '';
                self.renderMeals();
            });
        },

        renderMeals: function() {
            var meals = Storage.getMeals();
            var today = Util.today();
            var todayMeals = meals.filter(function(m) { return m.date === today; });
            var list = document.getElementById('meal-list');
            if (!list) return;

            if (todayMeals.length === 0) {
                list.innerHTML = '<li class="log-empty">No meals logged yet today.</li>';
                return;
            }

            var typeIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' };
            var ratingEmojis = ['', '😞', '😕', '😐', '😊', '🥗'];
            var html = '';
            todayMeals.forEach(function(m) {
                html += '<li>' +
                    '<span class="log-item-left">' +
                    '<span class="log-item-icon">' + (typeIcons[m.type] || '🍽️') + '</span>' +
                    '<span>' + m.description +
                    '<span class="log-item-detail">' + m.type + '</span>' +
                    '</span>' +
                    '</span>' +
                    '<span>' + (ratingEmojis[m.rating] || '😐') + '</span>' +
                    '</li>';
            });
            list.innerHTML = html;
        }
    },

    // ================================================
    // Study-Life Balance
    // ================================================
    study: {
        pomodoroTimer: null,
        pomodoroSeconds: 25 * 60,
        pomodoroTotal: 25 * 60,
        pomodoroRunning: false,
        isBreak: false,
        completedSessions: 0,
        breakPrompted: false,
        _ready: false,

        init: function() {
            if (this._ready) return;
            this._ready = true;
            this.initPomodoro();
            this.renderPomodoroCount();
            this.initStudyLogger();
            this.renderStudySummary();
            this.initBreakModal();
        },

        // ---- Pomodoro Timer ----
        initPomodoro: function() {
            var self = this;
            this.updatePomodoroDisplay();

            document.getElementById('pomodoro-play').addEventListener('click', function() {
                self.startPomodoro();
            });

            document.getElementById('pomodoro-pause').addEventListener('click', function() {
                self.pausePomodoro();
            });

            document.getElementById('pomodoro-reset').addEventListener('click', function() {
                self.resetPomodoro();
            });
        },

        startPomodoro: function() {
            var self = this;
            if (this.pomodoroRunning) return; // already running
            clearInterval(this.pomodoroTimer); // safety: clear any leaked interval
            this.pomodoroRunning = true;
            document.getElementById('pomodoro-play').style.display = 'none';
            document.getElementById('pomodoro-pause').style.display = 'inline-flex';

            var startTime = Date.now();
            var startSeconds = this.pomodoroSeconds;

            this.pomodoroTimer = setInterval(function() {
                var elapsed = Math.floor((Date.now() - startTime) / 1000);
                self.pomodoroSeconds = Math.max(0, startSeconds - elapsed);
                self.updatePomodoroDisplay();
                self.updatePomodoroRing();

                if (self.pomodoroSeconds <= 0) {
                    self.pomodoroComplete();
                }
            }, 250);
        },

        pausePomodoro: function() {
            this.pomodoroRunning = false;
            clearInterval(this.pomodoroTimer);
            document.getElementById('pomodoro-play').style.display = 'inline-flex';
            document.getElementById('pomodoro-pause').style.display = 'none';
        },

        resetPomodoro: function() {
            this.pomodoroRunning = false;
            clearInterval(this.pomodoroTimer);
            this.pomodoroSeconds = this.isBreak ? 5 * 60 : 25 * 60;
            this.pomodoroTotal = this.pomodoroSeconds;
            document.getElementById('pomodoro-play').style.display = 'inline-flex';
            document.getElementById('pomodoro-pause').style.display = 'none';
            this.updatePomodoroDisplay();
            this.updatePomodoroRing();
        },

        pomodoroComplete: function() {
            clearInterval(this.pomodoroTimer);
            this.pomodoroRunning = false;

            if (this.isBreak) {
                // Break finished → start new focus session
                this.isBreak = false;
                this.pomodoroSeconds = 25 * 60;
                this.pomodoroTotal = 25 * 60;
                document.getElementById('pomodoro-session-label').textContent = 'Focus Session';
                var fill = document.getElementById('pomodoro-circle');
                if (fill) fill.classList.remove('break-mode');

                // Notify
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200, 100, 400]);
                }
            } else {
                // Focus session finished
                this.completedSessions++;
                this.renderPomodoroCount();

                // Log study session
                Storage.addStudySession('Pomodoro Session', 25);

                // Start break
                this.isBreak = true;
                this.pomodoroSeconds = 5 * 60;
                this.pomodoroTotal = 5 * 60;
                document.getElementById('pomodoro-session-label').textContent = 'Break Time';
                var fill = document.getElementById('pomodoro-circle');
                if (fill) fill.classList.add('break-mode');

                // Show break reminder after every 2 sessions
                if (this.completedSessions % 2 === 0 && !this.breakPrompted) {
                    this.breakPrompted = true;
                    setTimeout(this.showBreakModal.bind(this), 1000);
                }

                // Notify
                if (navigator.vibrate) {
                    navigator.vibrate([300, 150, 300]);
                }
            }

            document.getElementById('pomodoro-play').style.display = 'inline-flex';
            document.getElementById('pomodoro-pause').style.display = 'none';
            this.updatePomodoroDisplay();
            this.updatePomodoroRing();
        },

        updatePomodoroDisplay: function() {
            var mins = Math.floor(this.pomodoroSeconds / 60);
            var secs = this.pomodoroSeconds % 60;
            var display = document.getElementById('pomodoro-time');
            if (display) {
                display.textContent = String(mins).padStart(2, '0') + ':' +
                                      String(secs).padStart(2, '0');
            }
        },

        updatePomodoroRing: function() {
            var circle = document.getElementById('pomodoro-circle');
            if (!circle) return;
            var circumference = 2 * Math.PI * 90; // r=90
            var progress = this.pomodoroSeconds / this.pomodoroTotal;
            var offset = circumference * (1 - progress);
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = offset;
        },

        renderPomodoroCount: function() {
            var el = document.getElementById('pomodoro-count');
            if (el) el.textContent = this.completedSessions;
        },

        // ---- Break Modal ----
        initBreakModal: function() {
            var self = this;
            document.getElementById('break-acknowledge').addEventListener('click', function() {
                document.getElementById('break-modal').style.display = 'none';
                self.breakPrompted = false;
            });
        },

        showBreakModal: function() {
            document.getElementById('break-modal').style.display = 'flex';
        },

        // ---- Study Logger ----
        initStudyLogger: function() {
            var self = this;
            document.getElementById('study-save').addEventListener('click', function() {
                var subject = document.getElementById('study-subject').value.trim();
                var minutes = parseInt(document.getElementById('study-minutes').value);

                if (!subject) {
                    var fb = document.getElementById('study-feedback');
                    Util.showFeedback(fb, 'Please enter a subject.', 'error');
                    return;
                }
                if (!minutes || minutes < 1 || minutes > 600) {
                    var fb2 = document.getElementById('study-feedback');
                    Util.showFeedback(fb2, 'Please enter 1-600 minutes.', 'error');
                    return;
                }

                Storage.addStudySession(subject, minutes);
                var fb3 = document.getElementById('study-feedback');
                Util.showFeedback(fb3, 'Logged ' + minutes + ' min of ' + subject + '! 📚', 'success');

                document.getElementById('study-subject').value = '';
                document.getElementById('study-minutes').value = 25;
                self.renderStudySummary();
            });
        },

        renderStudySummary: function() {
            var sessions = Storage.getStudySessions();
            var today = Util.today();
            var todaySessions = sessions.filter(function(s) { return s.date === today; });
            var totalMinutes = todaySessions.reduce(function(sum, s) { return sum + s.minutes; }, 0);
            var goal = Storage.getGoals().studyTarget;

            // Progress bar
            var bar = document.getElementById('study-bar');
            if (bar) {
                var pct = Math.min(100, Math.round((totalMinutes / goal) * 100));
                bar.style.width = pct + '%';
            }

            // Progress text
            var text = document.getElementById('study-progress-text');
            if (text) {
                text.textContent = totalMinutes + ' / ' + goal + ' minutes goal';
            }

            // Session list
            var list = document.getElementById('study-list');
            if (!list) return;

            if (todaySessions.length === 0) {
                list.innerHTML = '<li class="log-empty">No study sessions logged yet today.</li>';
                return;
            }

            var html = '';
            todaySessions.forEach(function(s) {
                html += '<li>' +
                    '<span class="log-item-left">' +
                    '<span class="log-item-icon">📖</span>' +
                    '<span>' + s.subject + '</span>' +
                    '</span>' +
                    '<span>' + s.minutes + ' min</span>' +
                    '</li>';
            });
            list.innerHTML = html;

            // Also update pomodoro count from stored sessions
            if (this.completedSessions === 0) {
                var pomodoroSessions = todaySessions.filter(function(s) {
                    return s.subject === 'Pomodoro Session';
                });
                this.completedSessions = pomodoroSessions.length;
                this.renderPomodoroCount();
            }
        }
    }
};


// ---- Page Router ----

document.addEventListener('DOMContentLoaded', function() {
    var pageName = document.body.dataset.page;
    if (pageName && page[pageName] && typeof page[pageName].init === 'function') {
        page[pageName].init();
    }

    // Set current date in header
    var dateEl = document.getElementById('current-date');
    if (dateEl) {
        var now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
});
