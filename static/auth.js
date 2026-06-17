/**
 * Wellbeing-Companion — Auth Module
 * Handles Google and Microsoft sign-in/sign-out via Firebase Authentication.
 * Firebase Auth persists the session in IndexedDB — users stay signed in
 * across page reloads and browser restarts without re-authenticating.
 * Stores user profile info and exposes sign-in state to other modules.
 */
var Auth = (function() {
    var _user = null;
    var _listeners = [];

    // ---- Init Firebase ----

    function init() {
        // Only initialise once
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded. Auth will be unavailable.');
            return;
        }
        if (firebase.apps.length > 0) {
            return; // Already initialised
        }

        try {
            firebase.initializeApp(FIREBASE_CONFIG);
        } catch (e) {
            console.error('Firebase init failed:', e);
            return;
        }

        // Listen for auth state changes (fires on page load if session is persisted)
        firebase.auth().onAuthStateChanged(function(user) {
            _user = user ? _serializeUser(user) : null;
            _notify();
        });

        // Handle redirect result on page load
        firebase.auth().getRedirectResult().then(function(result) {
            if (result.user) {
                console.log('Signed in via redirect:', result.user.displayName);
            }
        }).catch(function(error) {
            console.error('Sign-in redirect error:', error.message);
        });
    }

    function _serializeUser(user) {
        return {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        };
    }

    // ---- Sign-in helpers ----

    /** Generic popup-with-redirect-fallback sign-in flow. */
    function _signInWithPopup(provider) {
        return firebase.auth().signInWithPopup(provider).then(function(result) {
            _user = _serializeUser(result.user);
            _notify();
            return _user;
        }).catch(function(error) {
            if (error.code === 'auth/popup-blocked') {
                // Fall back to redirect
                return firebase.auth().signInWithRedirect(provider);
            }
            console.error('Sign-in error:', error);
            throw error;
        });
    }

    // ---- Public API ----

    /**
     * Sign in with Google account.
     * Uses a popup window; falls back to redirect on browsers that block popups.
     */
    function signInWithGoogle() {
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        return _signInWithPopup(provider);
    }

    /**
     * Sign in with Microsoft account.
     * Uses a popup window; falls back to redirect on browsers that block popups.
     */
    function signInWithMicrosoft() {
        var provider = new firebase.auth.OAuthProvider('microsoft.com');
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        return _signInWithPopup(provider);
    }

    /**
     * Sign up with email and password.
     * Firebase automatically signs the user in after successful account creation.
     */
    function signUpWithEmail(email, password) {
        return firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(function(result) {
                _user = _serializeUser(result.user);
                _notify();
                return _user;
            }).catch(function(error) {
                console.error('Email sign-up error:', error);
                throw error;
            });
    }

    /**
     * Sign in with email and password.
     */
    function signInWithEmail(email, password) {
        return firebase.auth().signInWithEmailAndPassword(email, password)
            .then(function(result) {
                _user = _serializeUser(result.user);
                _notify();
                return _user;
            }).catch(function(error) {
                console.error('Email sign-in error:', error);
                throw error;
            });
    }

    /** Alias for backward compatibility — uses Microsoft sign-in. */
    function signIn() {
        return signInWithMicrosoft();
    }

    /** Sign out and clear local state */
    function signOut() {
        return firebase.auth().signOut().then(function() {
            _user = null;
            _notify();
        });
    }

    /** Get current user (null if not signed in) */
    function getUser() {
        return _user;
    }

    /** Check if user is signed in */
    function isSignedIn() {
        return _user !== null;
    }

    /** Get the user's unique ID for Firestore storage */
    function getUid() {
        return _user ? _user.uid : null;
    }

    /** Register a listener: callback(user|null) — called on auth state change */
    function onAuthStateChanged(callback) {
        _listeners.push(callback);
        // Fire immediately with current state
        callback(_user);
    }

    function _notify() {
        _listeners.forEach(function(cb) { cb(_user); });
    }

    // Auto-init when script loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        signIn: signIn,
        signInWithGoogle: signInWithGoogle,
        signInWithMicrosoft: signInWithMicrosoft,
        signUpWithEmail: signUpWithEmail,
        signInWithEmail: signInWithEmail,
        signOut: signOut,
        getUser: getUser,
        isSignedIn: isSignedIn,
        getUid: getUid,
        onAuthStateChanged: onAuthStateChanged
    };
})();
