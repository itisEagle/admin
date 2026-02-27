// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyBRjtz0PsnppnMNatRr7PKxORJ6Si7pyJ0",
  authDomain: "test-52536.firebaseapp.com",
  databaseURL: "https://test-52536-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "test-52536",
  storageBucket: "test-52536.firebasestorage.app",
  messagingSenderId: "1077192555198",
  appId: "1:1077192555198:web:be02bab456b2be9456bcef",
  measurementId: "G-3PNWPC9PMQ"
};

const ADMIN_EMAILS = ["sb5846868@gmail.com"];

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// DO NOT use enablePersistence - it causes stale data on other devices

function isAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.indexOf(email.toLowerCase()) !== -1;
}

function ensureUserDocument(user) {
  var ref = db.collection("users").doc(user.uid);
  return ref.get().then(function(doc) {
    if (!doc.exists) {
      return ref.set({
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        role: isAdmin(user.email) ? "admin" : "user",
        createdAt: new Date().toISOString()
      });
    } else if (isAdmin(user.email) && doc.data().role !== "admin") {
      return ref.update({ role: "admin" });
    }
  }).catch(function(e) {
    console.warn("User doc error:", e);
  });
}
