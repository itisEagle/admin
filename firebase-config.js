// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyCzCegBYeuHI8iiwbTW5gSdTdPedolIW2U",
  authDomain: "sktc-dc2e2.firebaseapp.com",
  databaseURL: "https://sktc-dc2e2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sktc-dc2e2",
  storageBucket: "sktc-dc2e2.firebasestorage.app",
  messagingSenderId: "572422226934",
  appId: "1:572422226934:web:b02b9cd9bcf0ec6e433dd7",
  measurementId: "G-2G0TSYNDKF"
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
