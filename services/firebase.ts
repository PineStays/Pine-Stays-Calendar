// FIX: Use v8 compatibility with proper Analytics support detection
import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/firestore";
import "firebase/compat/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA3Blel8K0_QYSSgoqVWdpogUVrWaS-XxU",
  authDomain: "pinestayscalendar.firebaseapp.com",
  projectId: "pinestayscalendar",
  storageBucket: "pinestayscalendar.firebasestorage.app",
  messagingSenderId: "689496588721",
  appId: "1:689496588721:web:35117bb9fb43e114bafd90",
  measurementId: "G-EG4CV8B7NE"
};

// Initialize Firebase app
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// FIX: Prevent analytics crash in SSR or unsupported environments
if (typeof window !== "undefined" && firebase.analytics.isSupported && typeof firebase.analytics.isSupported === "function") {
  firebase.analytics.isSupported().then((supported) => {
    if (supported) {
      firebase.analytics();
    }
  });
}

// Export authentication and firestore for use in your app
export const auth = firebase.auth();
export const db_firebase = firebase.firestore();
export { firebase, firebaseConfig };
