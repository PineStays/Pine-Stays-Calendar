
// FIX: Update Firebase imports to use v8 compatibility mode
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


// FIX: Update Firebase initialization to use v8 compatibility mode
const app = firebase.initializeApp(firebaseConfig);
if (firebase.analytics.isSupported()) {
  firebase.analytics(app);
}

export const auth = firebase.auth();
export const db_firebase = firebase.firestore();
export { firebase, firebaseConfig };
