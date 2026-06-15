// auth.js
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

auth.onAuthStateChanged((user) => {
    const isLoginPage = window.location.pathname.includes("login.html");

    if (user) {
        if (isLoginPage) {
            window.location.href = "index.html";
        } else {
            const readyBadge = document.getElementById("system-ready-badge");
            const profileIcon = document.getElementById("user-profile-icon");
            if(readyBadge) readyBadge.style.display = "none"; 
            if(profileIcon) {
                let nameToUse = user.email.split('@')[0]; 
                profileIcon.innerText = getInitials(nameToUse);
                profileIcon.style.display = "flex"; 
            }
            const dispUser = document.getElementById("disp-user");
            const dispPass = document.getElementById("disp-pass");
            if(dispUser) dispUser.innerText = user.email;
            if(dispPass) dispPass.innerText = "********"; 
        }
    } else {
        if (!isLoginPage && !window.location.protocol.includes('file')) {
            window.location.href = "login.html";
        }
    }
});

// 🚀 লগইন করার ফাংশন (যেটা আগে মিসিং ছিল)
function processLogin() {
    let email = document.getElementById("email").value.trim();
    let pass = document.getElementById("password").value.trim();
    let errorMsg = document.getElementById("error-msg");

    if(email === "" || pass === "") { 
        if(errorMsg) { errorMsg.innerText = "Please enter valid credentials."; errorMsg.style.display = "block"; }
        return; 
    }

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => { window.location.href = "index.html"; })
        .catch((error) => {
            if(error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                auth.createUserWithEmailAndPassword(email, pass)
                    .then(() => { window.location.href = "index.html"; })
                    .catch(err => { if(errorMsg) { errorMsg.innerText = err.message; errorMsg.style.display = "block"; } });
            } else {
                if(errorMsg) { errorMsg.innerText = error.message; errorMsg.style.display = "block"; }
            }
        });
}

// 🌐 গুগল লগইন ফাংশন
function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(() => { window.location.href = "index.html"; })
        .catch((error) => {
            let errorMsg = document.getElementById("error-msg");
            if(errorMsg) { errorMsg.innerText = error.message; errorMsg.style.display = "block"; }
        });
}

function toggleProfile() {
    let dropdown = document.getElementById("profile-dropdown");
    if(dropdown) dropdown.classList.toggle("hidden");
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = "login.html";
    });
}
