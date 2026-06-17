/**
 * Firebase Configuration — EXAMPLE FILE
 *
 * Copy this file to firebase-config.js and fill in your Firebase project values.
 * Find them in: Firebase Console → Project Settings → General → Your apps → Web app.
 *
 * firebase-config.js is gitignored — it will NOT be committed to the repo.
 *
 * Before using Google sign-in:
 *   Firebase Console → Authentication → Sign-in method → Google → Enable
 *
 * Before using Microsoft sign-in:
 *   1. Register an app in Azure AD (portal.azure.com → App registrations)
 *   2. Firebase Console → Authentication → Sign-in method → Microsoft → Enable
 *   3. Paste your Azure AD Application (client) ID and Client Secret
 *   4. Copy the Redirect URI back into your Azure AD app's Redirect URIs
 */
var FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
