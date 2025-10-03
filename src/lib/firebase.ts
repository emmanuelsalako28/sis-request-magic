import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBtNlclxXUDfVZ3NNUPWk7en4Y1_Hts4vA",
  authDomain: "new-sis-form-worked-on.firebaseapp.com",
  projectId: "new-sis-form-worked-on",
  storageBucket: "new-sis-form-worked-on.appspot.com",
  messagingSenderId: "628529265979",
  appId: "1:628529265979:web:9991dd3cec5066e8a70b1e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app, "gs://new-sis-form-worked-on.appspot.com");
