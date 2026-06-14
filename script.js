let conversationThreads = []; 
let activeThreadIndex = -1;
let selectedImageBase64 = null; 

const API_URL = "https://suryabiswas018-skarl-ai.hf.space/chat";

// ==========================================
// 🌟 USER AUTHENTICATION & PROFILE LOGIC
// ==========================================

function getInitials(name) {
    let initials = name.trim().split(/\s+/).map(word => word[0]).join('');
    return initials.substring(0, 2).toUpperCase();
}

window.onload = function() {
    let savedUser = localStorage.getItem("skarl_user");

    if (savedUser) {
        document.getElementById("login-modal").style.display = "none";
        document.getElementById("system-ready-badge").style.display = "none";

        let icon = document.getElementById("user-profile-icon");
        if(icon) {
            icon.innerText = getInitials(savedUser);
            icon.style.display = "flex"; 
        }
    }
};

function handleLogin() {
    let user = document.getElementById("login-user").value.trim();
    let pass = document.getElementById("login-pass").value.trim();

    if (user === "" || pass === "") {
        alert("Please enter both username and password!");
        return;
    }

    localStorage.setItem("skarl_user", user);
    localStorage.setItem("skarl_pass", pass);

    document.getElementById("login-modal").style.display = "none";
    document.getElementById("system-ready-badge").style.display = "none";

    let icon = document.getElementById("user-profile-icon");
    if(icon) {
        icon.innerText = getInitials(user);
        icon.style.display = "flex";
    }
}

function toggleProfile() {
    let dropdown = document.getElementById("profile-dropdown");
    if(dropdown) {
        document.getElementById("disp-user").innerText = localStorage.getItem("skarl_user");
        document.getElementById("disp-pass").innerText = localStorage.getItem("skarl_pass");
        dropdown.classList.toggle("hidden");
    }
}

function logout() {
    localStorage.removeItem("skarl_user");
    localStorage.removeItem("skarl_pass");
    location.reload(); 
}

// ==========================================
// 🌟 CH
