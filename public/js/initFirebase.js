// public/js/initFirebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

// Configuración de tu aplicación web Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBq90_6wv9UQzY3fhN3IcZnZHbQrDU5LDo",
  authDomain: "expediente-en-linea.firebaseapp.com",
  projectId: "expediente-en-linea",
  storageBucket: "expediente-en-linea.firebasestorage.app",
  messagingSenderId: "69227775298",
  appId: "1:69227775298:web:916ff2c667834b4ccdf4db",
  measurementId: "G-J0EGDD83W9"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);