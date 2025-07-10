function showMessage(message, type = "success") {
  const box = document.getElementById("messageBox");
  box.textContent = message;
  box.className = `show ${type}`;
  
  //auto-hide after a few seconds
  setTimeout(() => {
    box.className = "hidden";
  }, 4000);
}

 // Import the functions
 import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
 import { getFirestore, doc , setDoc} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
 import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
 import { getAuth, signInWithEmailAndPassword ,
          sendPasswordResetEmail, onAuthStateChanged } 
          from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

 //Firebase configuration
 const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};
 // Initialize Firebase
 const app = initializeApp(firebaseConfig);
 const analytics = getAnalytics(app);
 const auth = getAuth();
 const db =  getFirestore(app);
 
 document.addEventListener("DOMContentLoaded", () => {
 document.getElementById("forgot-password").addEventListener("click", () => {
  const email = document.querySelector("#email").value;
  if (!email) {
    showMessage("Please enter your email in the login form.");
    return;
}
  if (email) {
    sendPasswordResetEmail(auth, email)
      .then(() => {
        showMessage(" Password reset email sent! Check your inbox.");
      })
      .catch((error) => {
        showMessage(" Error: " + error.message);
        console.error("Error sending password reset email:", error);
      });
  }
});
  const loginForm = document.querySelector("#login");
  const togglePassword = document.querySelector("#toggle-password");
// Show/hide password
  togglePassword.addEventListener("change", () => {
  password.type = togglePassword.checked ? "text" : "password";
});

if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.querySelector("#email").value;
      const password = document.querySelector("#password").value;

        signInWithEmailAndPassword(auth, email, password)
          .then(async(userCredential) => {
            const user = userCredential.user;
            if (!user.emailVerified) {
              showMessage("Email not verified. Please check your inbox.");
            }
            else{
            // Logged in successfully
            console.log("User logged in:", user);
            // link the account.html when login happens.
            window.location.href = "carinfo.html";             
            }
            loginForm.reset();
          })
          .catch((error) => {
            // If the email is not found or password doesn't match
            if (error.code =="auth/invalid-credential"){
              showMessage("EMAIL OR PASSWORD NOT CORRECT, please try again");
          }
          else {
            showMessage(" SOMETHING GOING WRONG, Please try again.");
            console.log(error.message);
          }
          loginForm.reset();
       });
    });
  }
});

onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
     const userId = user.uid;
    // Send the UID to ESP32 via HTTP POST
            fetch("http://192.168.92.245/receive_uid", {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded"
              },
                //body: "userId=test123"
                 body: `userId=${encodeURIComponent(userId)}`
            })
            .then(response => response.json())
            .then(data => console.log("UID sent successfully", data))
            .catch(error => console.error("Error:", error));
          }
   else {
    console.log("user logged out");
  }
});