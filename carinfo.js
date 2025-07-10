import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, getDoc, getDocs,collection, query, orderBy, limit,where } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";

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
const db = getFirestore(app);

// DOM elements
const userEmailEl = document.getElementById('user-email');

let currentUser = null;
let unsubscribe = null;

// Initialize dashboard
function initDashboard() {
    //at firebase storing in firebase under users
    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            console.log("User UID:", user.uid);
            currentUser = user;
            userEmailEl.textContent = user.email;

            // Store user login info in Firestore
            await setDoc(doc(db, "users", currentUser.uid), {
                email: user.email,
                UID: user.uid,
                signedInAt: new Date()
            }, { merge: true });
        } else {
            console.log("User is logged out or not verified");
            window.location.href = 'login.html';
        }
    });
    listenToFaceLogsForCars();

}

const carDataContainer = document.getElementById('carDataContainer');

// UIDs of your two cars — replace with real ones
const carUIDs = [
  { uid: "stored uid in firebase", label: "Owned Car" }, //789117
  { uid: "stored uid in firebase", label: "Near Car" } //nemo
];
// Loop through both cars and listen for real-time data
carUIDs.forEach(car => {
    const carDataRef = collection(db, "users", car.uid, "carData");
    const q = query(carDataRef, orderBy("timestamp", "desc"), limit(1));
  
    onSnapshot(q, snapshot => {
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        displayCarData(car.uid, car.label, data);
      });
    });
  });

function displayCarData(uid, label, data) {
  const cardId = `card-${uid}`;
  let card = document.getElementById(cardId);

  const html = `
    <h2>${label}</h2>
    <div class="car-data"><strong>Speed:</strong> ${data.speed} m/s</div>
    <div class="car-data"><strong>Acceleration:</strong> ${data.acceleration} m/s²</div>
    <div class="car-data"><strong>Longitude:</strong> ${data.longitude}</div>
    <div class="car-data"><strong>Latitude:</strong> ${data.latitude}</div>
    <div class="car-data"><strong>Direction:</strong> ${data.direction}</div>
    <div class="car-data"><strong>dataType:</strong> ${data.scenarioType}</div>
    <div class="car-data" style="color: red;"><strong>Warning:</strong> ${data.featuresWarning}</div>
    <div class="car-data"><strong>Timestamp:</strong> ${new Date(data.timestamp.seconds * 1000).toLocaleString()
    }</div>
  `;

  if (card) {
    card.innerHTML = html;
  } else {
    card = document.createElement("div");
    card.className = "car-card";
    card.id = cardId;
    card.innerHTML = html;
    carDataContainer.appendChild(card);
  }
}

function listenToFaceLogsForCars() {
  const faceLogRef = collection(db, "face_log");

  carUIDs.forEach(car => {
    const faceQuery = query(
      faceLogRef,
      where("carRef", "==", car.uid),
      limit(1)
    );

    onSnapshot(faceQuery, snapshot => {
      snapshot.forEach(doc => {
        const faceData = doc.data();
        updateFaceLogUI(car.uid, faceData);
      });
    });
  });
}


function updateFaceLogUI(uid, faceData) {
  const card = document.getElementById(`card-${uid}`);
  if (!card) return;

  let faceSection = card.querySelector(".face-data");
  if (!faceSection) {
    faceSection = document.createElement("div");
    faceSection.className = "face-data";
    card.appendChild(faceSection);
  }

  faceSection.innerHTML = `
    <div class="car-data"><strong>Face:</strong> ${faceData.name}</div>
    <div class="car-data"><strong>Status:</strong> ${faceData.status}</div>
        <div class="car-data"><strong>Warning:</strong> ${faceData.Warning}</div>

  `;
}


// Logout functionality
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#logout-btn").addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "login.html";
        }).catch(error => {
            console.error("Logout error:", error);
        });
    });
    initDashboard();
});