import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCvoGYOYwR1elou-xah0fbAY38zKZO2Xwo",
  authDomain: "sis-project-3950f.firebaseapp.com",
  projectId: "sis-project-3950f",
  storageBucket: "sis-project-3950f.appspot.com",
  messagingSenderId: "232113794323",
  appId: "1:232113794323:web:b62c081b0fa5d1413f3ee6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
