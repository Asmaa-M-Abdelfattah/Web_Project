 function showMessage(message, type = "success") {
  const box = document.getElementById("messageBox");
  box.textContent = message;
  box.className = `show ${type}`;
  
  // Optional: auto-hide after a few seconds
  setTimeout(() => {
    box.className = "hidden";
  }, 5000);
}

// Import the functions you need from the SDKs you need
 import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
 import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
 import { getFirestore, doc , setDoc} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
 import { getAuth, createUserWithEmailAndPassword ,
          GoogleAuthProvider,signInWithPopup,
          onAuthStateChanged,  sendEmailVerification  } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
 const provider = new GoogleAuthProvider();
 
  
document.getElementById("google").addEventListener("click", () => {
  signInWithPopup(auth, provider)
   .then((result) => {

    onAuthStateChanged(auth, (user) => {
      if (user) {
          console.log("User email is ", user.email);
        } else {
          console.log("No user is currently signed in.");
        }
    });
    
     const user = result.user;
    showMessage(`Welcome, ${user.displayName}! You have successfully signed up with Google.`);
    })
    .catch((error) => {
    console.error("Error:", error.message);
    showMessage("An error occurred while signing up. Please try again.");
    });
});

document.addEventListener("DOMContentLoaded", () => {
const signupForm = document.querySelector("#signup");
const togglePassword = document.querySelector("#toggle-password");
const toggleConfirmPassword = document.querySelector("#toggle-confirm-password");
const confirmPassword = document.querySelector("#confirm-password");
const message = document.querySelector("#password-match-message");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      showMessage("Verification email sent. Please check your inbox 📩 before logging in.");

     //signupForm.reset();
    } catch (error) {
      console.error("Error during sign-up:", error.message);
      showMessage("please, try again later : thank you ^_^")
      signupForm.reset();
    }
  });
}
//resend email verification
const resendBtn = document.getElementById("resendVerificationBtn");

if (resendBtn) {
  resendBtn.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        showMessage("Verification email resent! Check your inbox. 📩");
      } catch (error) {
        console.error("Error resending verification email:", error.message);
        showMessage("Failed to resend verification email.");
      }
    } else if (!user) {
      showMessage("Please sign up to resend verification email.");
    } else {
      showMessage("Email already verified!");
    }
  });
}
  // Show/hide password
    togglePassword.addEventListener("change", () => {
      password.type = togglePassword.checked ? "text" : "password";
    });
    toggleConfirmPassword.addEventListener("change", () => {
      confirmPassword.type = toggleConfirmPassword.checked ? "text" : "password";
    });
  // Password match checker
    function checkPasswordMatch() {
    if (confirmPassword.value == "") {
    message.textContent = "";
    return;
    }
    if (password.value == confirmPassword.value) {
    message.className = "match";
    confirmPassword.style.borderColor = "green";
    confirmPassword.style.color = "black";
    } else {
    message.className = "no-match";
    confirmPassword.style.borderColor = "red";
    confirmPassword.style.color = "red";
    }
    }
    confirmPassword.addEventListener("input", checkPasswordMatch);
    password.addEventListener("input", checkPasswordMatch);
});

