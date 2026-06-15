// Auth.js (Final Version)

const firebaseConfig = {
    apiKey: "AIzaSyB65GFRDmzgxKuC9coyqOlARLdA7CZwYSY",
    authDomain: "skarl-ai.firebaseapp.com",
    projectId: "skarl-ai",
    storageBucket: "skarl-ai.firebasestorage.app",
    messagingSenderId: "21596213609",
    appId: "1:21596213609:web:6c503608530d5a9010adf8"
};

// ফায়ারবেস ইনিশিয়ালাইজ করা
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// নামের প্রথম দুই অক্ষর নেওয়ার ফাংশন
function getInitials(name) {
    let initials = name.trim().split(/[\s_.]+/).map(word => word[0]).join('');
    return initials.substring(0, 2).toUpperCase();
}

// 🌟 লগইন স্ট্যাটাস চেক করা (মেইন লজিক)
auth.onAuthStateChanged((user) => {
    const isLoginPage = window.location.pathname.includes("login.html");
    const bypassedEmail = localStorage.getItem("bypassUser");

    if (user || bypassedEmail) {
        if (isLoginPage) {
            window.location.href = "index.html"; // লগইন থাকলে সোজা চ্যাট পেজে পাঠাবে
        } else {
            const readyBadge = document.getElementById("system-ready-badge");
            const profileIcon = document.getElementById("user-profile-icon");
            if(readyBadge) readyBadge.style.display = "none"; 
            
            if(profileIcon) {
                // স্মার্ট লজিক: কে লগইন করেছে তার ওপর ভিত্তি করে নাম দেখাবে
                let nameToUse = "Guest";
                if(user) {
                    if(user.email) nameToUse = user.email.split('@')[0];
                    else if (user.displayName) nameToUse = user.displayName;
                } else if (bypassedEmail) nameToUse = bypassedEmail.split('@')[0];

                profileIcon.innerText = getInitials(nameToUse);
                profileIcon.style.display = "flex"; 
            }

            const dispUser = document.getElementById("disp-user");
            const dispPass = document.getElementById("disp-pass");
            
            if(dispUser) dispUser.innerText = user ? (user.email || "Guest User (Anonymous)") : bypassedEmail;
            if(dispPass) {
                if (user) dispPass.innerText = user.isAnonymous ? "No Password" : "********";
                else dispPass.innerText = "Bypassed Access";
            }
        }
    } else {
        if (!isLoginPage && !window.location.protocol.includes('file') && !bypassedEmail) {
            window.location.href = "login.html"; // লগআউট করলে লগইন পেজে পাঠাবে
        }
    }
});

// 🚀 Email/Password Login
function processLogin() {
    let email = document.getElementById("email").value.trim();
    let pass = document.getElementById("password").value.trim();
    let errorMsg = document.getElementById("error-msg");

    const bypassEmails = ["hellowatch343@gmail.com", "suryabiswas018@gmail.com"];
    const bypassUnlocked = localStorage.getItem("bypassUnlocked") === "true"; // Check if bypass is unlocked

    if (bypassUnlocked && bypassEmails.includes(email)) { // Only bypass if unlocked and email matches
        localStorage.setItem("bypassUser", email);
        window.location.href = "index.html";
        return;
    }

    if(email === "" || pass === "") { 
        if(errorMsg) { errorMsg.innerText = "Please enter valid credentials."; errorMsg.style.display = "block"; }
        return; 
    }

    auth.signInWithEmailAndPassword(email, pass)
        .catch((error) => {
            if(error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                // ইউজার না থাকলে নতুন অ্যাকাউন্ট ক্রিয়েট করবে
                auth.createUserWithEmailAndPassword(email, pass)
                    .catch(err => { if(errorMsg) { errorMsg.innerText = err.message; errorMsg.style.display = "block"; } });
            } else {
                if(errorMsg) { errorMsg.innerText = error.message; errorMsg.style.display = "block"; }
            }
        });
}

// 🌐 Google Login
function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((error) => {
        let errorMsg = document.getElementById("error-msg");
        if(errorMsg) { errorMsg.innerText = error.message; errorMsg.style.display = "block"; }
    });
}

// 🐙 GitHub Login
function githubLogin() {
    const provider = new firebase.auth.GithubAuthProvider();
    auth.signInWithPopup(provider).catch((error) => {
        let errorMsg = document.getElementById("error-msg");
        if(errorMsg) { errorMsg.innerText = error.message; errorMsg.style.display = "block"; }
    });
}

// 🕵️ Guest Login (Anonymous)
function guestLogin() {
    auth.signInAnonymously().catch((error) => {
        let errorMsg = document.getElementById("error-msg");
        if(errorMsg) { errorMsg.innerText = error.message; errorMsg.style.display = "block"; }
    });
}

// প্রোফাইল ড্রপডাউন খোলা/বন্ধ করা
function toggleProfile() {
    let dropdown = document.getElementById("profile-dropdown");
    if(dropdown) dropdown.classList.toggle("hidden");
}

// লগআউট করা
function logout() {
    localStorage.removeItem("bypassUser");
    localStorage.removeItem("bypassUnlocked"); // Clear the bypass unlock flag
    auth.signOut();
}
