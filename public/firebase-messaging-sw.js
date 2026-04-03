importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyDlOOGVMNATlRpcE9GDW3jYsAWEmfDlmB8",
  authDomain: "chatty-2026.firebaseapp.com",
  projectId: "chatty-2026",
  storageBucket: "chatty-2026.firebasestorage.app",
  messagingSenderId: "967516341271",
  appId: "1:967516341271:web:7155a13567f21e64740852",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  
  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message.",
    icon: "/favicon.ico"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
