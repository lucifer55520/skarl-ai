// ==========================================
// 🔥 FIREBASE INITIALIZATION (একবারই লিখবেন)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyB65GFRDmzgxKuC9coyqOlARLdA7CZwYSY",
    authDomain: "skarl-ai.firebaseapp.com",
    projectId: "skarl-ai",
    storageBucket: "skarl-ai.firebasestorage.app",
    messagingSenderId: "21596213609",
    appId: "1:21596213609:web:6c503608530d5a9010adf8"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

function getInitials(name) {
    let initials = name.trim().split(/[\s_.]+/).map(word => word[0]).join('');
    return initials.substring(0, 2).toUpperCase();
}

// ==========================================
// 🔐 SMART AUTH STATE LISTENER (রাউটিং কন্ট্রোল)
// ==========================================
auth.onAuthStateChanged((user) => {
    const isLoginPage = window.location.pathname.includes("login.html");

    if (user) {
        // 🟢 ইউজার লগইন আছে
        if (isLoginPage) {
            // যদি ভুল করে লগইন পেজে চলে আসে, তবে তাকে index.html এ পাঠিয়ে দাও
            window.location.href = "index.html";
        } else {
            // index.html এ থাকলে প্রোফাইল আইকন (SB) দেখাও
            const readyBadge = document.getElementById("system-ready-badge");
            const profileIcon = document.getElementById("user-profile-icon");
            
            if(readyBadge) readyBadge.style.display = "none"; 
            if(profileIcon) {
                let nameToUse = user.email.split('@')[0]; 
                profileIcon.innerText = getInitials(nameToUse);
                profileIcon.style.display = "flex"; 
            }
            
            // ড্রপডাউন মেনুর জন্য
            const dispUser = document.getElementById("disp-user");
            const dispPass = document.getElementById("disp-pass");
            if(dispUser) dispUser.innerText = user.email;
            if(dispPass) dispPass.innerText = "********"; 
        }
    } else {
        // 🔴 ইউজার লগআউট অবস্থায় আছে
        if (!isLoginPage) {
            // index.html এ থাকলে তাকে login.html এ বের করে দাও
            window.location.href = "login.html";
        }
    }
});

// ==========================================
// 🚀 LOGIN / SIGNUP LOGIC (login.html এর জন্য)
// ==========================================
function processLogin() {
    let email = document.getElementById("email").value.trim();
    let pass = document.getElementById("password").value.trim();
    let errorMsg = document.getElementById("error-msg");

    if(email === "" || pass === "") { 
        errorMsg.innerText = "Please enter valid credentials."; 
        errorMsg.style.display = "block"; 
        return; 
    }

    auth.signInWithEmailAndPassword(email, pass)
        .catch((error) => {
            // অ্যাকাউন্ট না থাকলে অটোমেটিক সাইন-আপ
            if(error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                auth.createUserWithEmailAndPassword(email, pass)
                    .catch(err => { errorMsg.innerText = err.message; errorMsg.style.display = "block"; });
            } else {
                errorMsg.innerText = error.message; errorMsg.style.display = "block";
            }
        });
}

function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((error) => {
        let errorMsg = document.getElementById("error-msg");
        if(errorMsg) {
            errorMsg.innerText = error.message;
            errorMsg.style.display = "block";
        }
    });
}

// ==========================================
// 🚪 LOGOUT LOGIC (index.html এর জন্য)
// ==========================================
function toggleProfile() {
    let dropdown = document.getElementById("profile-dropdown");
    if(dropdown) dropdown.classList.toggle("hidden");
}

function logout() {
    auth.signOut(); // সাইন আউট করলেই উপরের Listener অটোমেটিক লগইন পেজে পাঠিয়ে দেবে
}
