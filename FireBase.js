<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDRRBT5cVklz8CIxD_VpsexaiErH09H8Hc",
    authDomain: "estudaai-ddb6a.firebaseapp.com",
    projectId: "estudaai-ddb6a",
    storageBucket: "estudaai-ddb6a.firebasestorage.app",
    messagingSenderId: "974312409515",
    appId: "1:974312409515:web:ef635d71abf934241d6aee",
    measurementId: "G-9X8PNR6S6L"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>