import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVlaEuLGK4-AQx5QrgSGW06DwvRiFqWwI",
  authDomain: "pine-stays-calendar-9823e.firebaseapp.com",
  projectId: "pine-stays-calendar-9823e",
  storageBucket: "pine-stays-calendar-9823e.firebasestorage.app",
  messagingSenderId: "960055654394",
  appId: "1:960055654394:web:e6789ad79df0e6aef4d643",
  measurementId: "G-TBBPZYPWZ7"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db_firebase = getFirestore(app);
export { firebaseConfig };
