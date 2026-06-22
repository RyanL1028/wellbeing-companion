/**
 * Wellbeing-Companion — Storage Module
 * Single source of truth for all data access.
 *
 * Architecture:
 *  - Local-first: all reads/writes hit localStorage immediately (fast, offline-capable).
 *  - Cloud sync: when signed in with Microsoft, data also persists to Firestore
 *    under /users/{uid}/wellness-data. On sign-in, Firestore data is merged into
 *    localStorage (latest-wins on per-entry date matching).
 *
 * No other file should call localStorage or Firestore directly.
 */
var STORAGE_KEY = 'wellnessCompanion';
var FIRESTORE_DOC = 'wellnessData';

var Storage = (function() {
    var _cloudEnabled = false;
    var _uid = null;

    // ---- Cloud helpers ----

    /** Enable cloud sync for the given user UID. Called on sign-in. */
    function enableCloud(uid) {
        _uid = uid;
        _cloudEnabled = true;
    }

    /** Disable cloud sync. Called on sign-out. */
    function disableCloud() {
        _uid = null;
        _cloudEnabled = false;
    }

    /** Load data from Firestore and merge into localStorage (latest-wins). */
    function loadFromCloud(callback) {
        if (!_cloudEnabled || !_uid) {
            if (callback) callback();
            return;
        }

        var db = firebase.firestore();
        db.collection('users').doc(_uid).collection('data').doc(FIRESTORE_DOC).get()
            .then(function(doc) {
                if (doc.exists) {
                    var cloudData = doc.data();
                    if (cloudData) {
                        _mergeCloudIntoLocal(cloudData);
                    }
                }
                if (callback) callback();
            })
            .catch(function(err) {
                console.warn('Failed to load cloud data:', err.message);
                if (callback) callback();
            });
    }

    /** Merge cloud data into localStorage — keep the entry with the latest date for each category. */
    function _mergeCloudIntoLocal(cloudData) {
        var local = _read();

        // Merge arrays by collecting all entries, then deduplicating by composite key
        local.moodLog = _mergeArrays(local.moodLog, cloudData.moodLog || [], 'date');
        local.meals = _mergeArrays(local.meals, cloudData.meals || [], 'date', 'type', 'description');
        local.activities = _mergeArrays(local.activities, cloudData.activities || [], 'date', 'type');
        local.studySessions = _mergeArrays(local.studySessions, cloudData.studySessions || [], 'date', 'subject');

        // Merge water glasses: for each date key, take the higher count
        if (cloudData.waterGlasses) {
            var merged = {};
            var cloudW = cloudData.waterGlasses;
            var localW = local.waterGlasses || {};
            Object.keys(cloudW).forEach(function(k) {
                merged[k] = Math.max(cloudW[k], localW[k] || 0);
            });
            Object.keys(localW).forEach(function(k) {
                if (!(k in merged)) merged[k] = localW[k];
            });
            local.waterGlasses = merged;
        }

        // Merge goals: local wins (user may have adjusted offline)
        if (cloudData.goals) {
            local.goals = local.goals || {};
            Object.keys(cloudData.goals).forEach(function(k) {
                if (!(k in local.goals)) {
                    local.goals[k] = cloudData.goals[k];
                }
            });
        }

        _write(local);
    }

    /** Merge two arrays, deduplicating entries that share the same composite key fields. */
    function _mergeArrays(localArr, cloudArr) {
        var keyFields = Array.prototype.slice.call(arguments, 2);
        var seen = {};
        var result = [];

        // Add cloud entries first (they might be older), then local entries overwrite
        cloudArr.concat(localArr).forEach(function(item) {
            var key = keyFields.map(function(f) { return item[f] || ''; }).join('|');
            if (!seen[key]) {
                seen[key] = true;
                result.push(item);
            }
        });

        return result;
    }

    /** Push current localStorage data to Firestore. */
    function syncToCloud() {
        if (!_cloudEnabled || !_uid) return;

        var data = _read();
        // Remove undefined/complex objects that Firestore doesn't accept
        var clean = {
            moodLog: data.moodLog,
            waterGlasses: data.waterGlasses,
            meals: data.meals,
            activities: data.activities,
            studySessions: data.studySessions,
            goals: data.goals,
            _syncedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        var db = firebase.firestore();
        db.collection('users').doc(_uid).collection('data').doc(FIRESTORE_DOC)
            .set(clean, { merge: true })
            .catch(function(err) {
                console.warn('Cloud sync failed:', err.message);
            });
    }

    // ---- Private helpers ----

    function _read() {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch (e) {
                return _defaultData();
            }
        }
        return _defaultData();
    }

    function _write(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // Throttled cloud sync — uses a short debounce to batch rapid writes
        _scheduleCloudSync();
    }

    var _syncTimer = null;
    function _scheduleCloudSync() {
        if (_syncTimer) clearTimeout(_syncTimer);
        _syncTimer = setTimeout(function() {
            syncToCloud();
            _syncTimer = null;
        }, 500);
    }

    function _defaultData() {
        return {
            moodLog: [],
            waterGlasses: {},
            meals: [],
            activities: [],
            studySessions: [],
            sleepLog: [],
            goals: {
                waterTarget: 8,
                activityTarget: 30,
                studyTarget: 120,
                sleepTarget: 8
            }
        };
    }

    // ---- Sleep ----

    function getSleepLog() { return _read().sleepLog || []; }

    function addSleep(bedtime, wakeTime, quality, note) {
        var data = _read();
        data.sleepLog.push({ date: _today(), bedtime: bedtime, wakeTime: wakeTime, quality: quality || 3, note: note || '' });
        _write(data);
    }

    // ---- Gratitude ----
    function getGratitudeLog() { return _read().gratitudeLog || []; }
    function addGratitude(entry) {
        var data = _read();
        if (!data.gratitudeLog) data.gratitudeLog = [];
        data.gratitudeLog.push({ date: _today(), text: entry });
        _write(data);
    }

    // ---- Goals ----
    function getWeeklyGoals() { var g = _read().goals; return { water: g.waterTarget||8, activity: g.activityTarget||30, study: g.studyTarget||120, sleep: g.sleepTarget||8 }; }
    function setWeeklyGoal(key, value) { var data = _read(); data.goals[key] = value; _write(data); }

    function getSleepStreak() {
        var data = _read();
        if (!data.sleepLog || !data.sleepLog.length) return 0;
        var dates = data.sleepLog.filter(function(s) { return (s.bedtime && s.wakeTime); }).map(function(s) { return s.date; });
        return _computeStreakFromDates(dates);
    }

    function _today() {
        return new Date().toISOString().split('T')[0];
    }

    function _todayKey() {
        var d = new Date();
        return d.getFullYear() + '-' +
               String(d.getMonth() + 1).padStart(2, '0') + '-' +
               String(d.getDate()).padStart(2, '0');
    }

    // ---- Moods ----

    function getMoods() {
        return _read().moodLog;
    }

    function addMood(mood, note) {
        var data = _read();
        data.moodLog.push({
            date: _today(),
            mood: mood,
            note: note || ''
        });
        _write(data);
    }

    function getMoodStreak() {
        return _computeStreak(_read().moodLog);
    }

    // ---- Water ----

    function getWaterGlasses(dateKey) {
        var data = _read();
        return data.waterGlasses[dateKey] || 0;
    }

    function fillWaterGlass() {
        var data = _read();
        var key = _todayKey();
        var current = data.waterGlasses[key] || 0;
        if (current < 8) {
            data.waterGlasses[key] = current + 1;
        }
        _write(data);
        return data.waterGlasses[key];
    }

    function unfillWaterGlass() {
        var data = _read();
        var key = _todayKey();
        var current = data.waterGlasses[key] || 0;
        if (current > 0) {
            data.waterGlasses[key] = current - 1;
        }
        _write(data);
        return data.waterGlasses[key];
    }

    function resetWater() {
        var data = _read();
        data.waterGlasses[_todayKey()] = 0;
        _write(data);
    }

    function getWaterStreak() {
        var data = _read();
        var dates = Object.keys(data.waterGlasses).filter(function(d) {
            return data.waterGlasses[d] >= data.goals.waterTarget;
        });
        return _computeStreakFromDates(dates);
    }

    // ---- Meals ----

    function getMeals() {
        return _read().meals;
    }

    function addMeal(type, description, rating) {
        var data = _read();
        data.meals.push({
            date: _today(),
            type: type,
            description: description,
            rating: rating
        });
        _write(data);
    }

    // ---- Activities ----

    function getActivities() {
        return _read().activities;
    }

    function addActivity(type, minutes) {
        var data = _read();
        data.activities.push({
            date: _today(),
            type: type,
            minutes: minutes
        });
        _write(data);
    }

    function getActivityStreak() {
        return _computeStreak(_read().activities);
    }

    // ---- Study Sessions ----

    function getStudySessions() {
        return _read().studySessions;
    }

    function addStudySession(subject, minutes) {
        var data = _read();
        data.studySessions.push({
            date: _today(),
            subject: subject,
            minutes: minutes
        });
        _write(data);
    }

    function getStudyStreak() {
        return _computeStreak(_read().studySessions);
    }

    // ---- Goals ----

    function getGoals() {
        return _read().goals;
    }

    function setGoal(key, value) {
        var data = _read();
        data.goals[key] = value;
        _write(data);
    }

    // ---- Streak calculation ----

    function _computeStreak(log) {
        var dates = {};
        log.forEach(function(entry) {
            dates[entry.date] = true;
        });
        return _computeStreakFromDates(Object.keys(dates));
    }

    function _computeStreakFromDates(dates) {
        var streak = 0;
        var d = new Date();
        for (var i = 0; i < 365; i++) {
            var key = d.getFullYear() + '-' +
                      String(d.getMonth() + 1).padStart(2, '0') + '-' +
                      String(d.getDate()).padStart(2, '0');
            if (dates.indexOf(key) !== -1) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else if (i === 0) {
                d.setDate(d.getDate() - 1);
                continue;
            } else {
                break;
            }
        }
        return streak;
    }

    // ---- Public API ----

    return {
        // Cloud sync control (called by auth module)
        enableCloud: enableCloud,
        disableCloud: disableCloud,
        loadFromCloud: loadFromCloud,
        syncToCloud: syncToCloud,

        // Moods
        getMoods: getMoods,
        addMood: addMood,
        getMoodStreak: getMoodStreak,

        // Water
        getWaterGlasses: getWaterGlasses,
        fillWaterGlass: fillWaterGlass,
        unfillWaterGlass: unfillWaterGlass,
        resetWater: resetWater,
        getWaterStreak: getWaterStreak,

        // Meals
        getMeals: getMeals,
        addMeal: addMeal,

        // Activities
        getActivities: getActivities,
        addActivity: addActivity,
        getActivityStreak: getActivityStreak,

        // Study
        getStudySessions: getStudySessions,
        addStudySession: addStudySession,
        getStudyStreak: getStudyStreak,

        // Goals
        getGoals: getGoals,
        setGoal: setGoal,

        // Sleep
        getSleepLog: getSleepLog,
        addSleep: addSleep,
        getSleepStreak: getSleepStreak,

        getGratitudeLog: getGratitudeLog,
        addGratitude: addGratitude,

        getWeeklyGoals: getWeeklyGoals,
        setWeeklyGoal: setWeeklyGoal,

        // Helpers
        _today: _today,
        _todayKey: _todayKey
    };
})();
