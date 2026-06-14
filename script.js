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
// 🌟 CHAT & IMAGE UPLOAD LOGIC
// ==========================================

document.getElementById('image-upload')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        selectedImageBase64 = event.target.result;
        document.getElementById('preview-container').style.display = 'block';
        document.getElementById('image-preview').src = selectedImageBase64;
    };
    reader.readAsDataURL(file);
});

function removeImage() {
    selectedImageBase64 = null;
    const uploadInput = document.getElementById('image-upload');
    if (uploadInput) uploadInput.value = "";
    document.getElementById('preview-container').style.display = 'none';
}

function appendMessage(text, sender, isError = false, imgSrc = null) {
    const chat = document.getElementById("chat");
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-message" : "ai-message";

    if (isError) {
        div.classList.add("error-message");
    }

    if (imgSrc && sender === "user") {
        const img = document.createElement("img");
        img.src = imgSrc;
        img.className = "user-img-msg";
        div.appendChild(img);
    }

    if (text) {
        // 🌟 Markdown formatting support (Bold and Italic)
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        const textSpan = document.createElement("span");
        textSpan.innerHTML = formattedText;
        div.appendChild(textSpan);
    }

    wrapper.appendChild(div);
    chat.appendChild(wrapper);
    chat.scrollTop = chat.scrollHeight;
    return wrapper;
}

function saveThreads() {
    localStorage.setItem("skyAiConversationThreads", JSON.stringify(conversationThreads));
    renderSidebar();
}

function loadThreads() {
    const stored = localStorage.getItem("skyAiConversationThreads");
    if (stored) {
        conversationThreads = JSON.parse(stored);
        renderSidebar();
    }
}

function renderSidebar() {
    const list = document.getElementById("history-list");
    if (!list) return;
    list.innerHTML = "";
    conversationThreads.forEach((thread, index) => {
        const item = document.createElement("div");
        item.className = `history-item ${index === activeThreadIndex ? "active" : ""}`;
        item.innerText = thread.title || "Untitled Chat";
        item.onclick = () => {
            loadThreadIntoChat(index);
        };
        list.appendChild(item);
    });
}

function loadThreadIntoChat(index){
    activeThreadIndex = index;
    const chat = document.getElementById("chat");
    chat.innerHTML = "";
    conversationThreads[index].messages.forEach(msg => {
        appendMessage(msg.text, msg.sender, false, msg.image);
    });
    renderSidebar();

    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }
}

function startNewChat() {
    activeThreadIndex = -1; 
    document.getElementById("chat").innerHTML = ""; 
    renderSidebar(); 

    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }
}

function clearHistory(){
    document.getElementById('custom-confirm').classList.add('active');
}

function confirmClear(){
    conversationThreads = [];
    activeThreadIndex = -1;
    localStorage.removeItem("skyAiConversationThreads");
    document.getElementById("chat").innerHTML = "";
    renderSidebar();
    closeModal(); 
}

async function sendMessage(){
    const input = document.getElementById("message");
    let userText = input.value.trim();

    if(!userText && selectedImageBase64) {
        userText = "Please analyze this image and explain what you see.";
    } else if(!userText || input.disabled){
        return;
    }

    input.disabled = true;

    if(activeThreadIndex === -1){
        conversationThreads.push({
            title: userText.substring(0,25) || "Image Analysis",
            messages: []
        });
        activeThreadIndex = conversationThreads.length - 1;
    }

    appendMessage(userText, "user", false, selectedImageBase64);

    conversationThreads[activeThreadIndex].messages.push({
        text: userText,
        sender: "user",
        image: selectedImageBase64 
    });

    const imageToSend = selectedImageBase64; 
    input.value = "";
    removeImage(); 

    const typing = appendMessage("Thinking...", "ai");

    const currentThread = conversationThreads[activeThreadIndex].messages;
    const historyForApi = currentThread.slice(0, -1).map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text
    }));

    try{
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ 
                message: userText,
                history: historyForApi,
                image: imageToSend 
            })
        });
        const data = await response.json();
        typing.remove();

        if(!response.ok){
            throw new Error(data.detail || "Server error");
        }

        appendMessage(data.reply, "ai");
        conversationThreads[activeThreadIndex].messages.push({
            text: data.reply,
            sender: "ai"
        });
        saveThreads();
    }
    catch(error){
        typing.remove();
        appendMessage("Connection error: " + error.message, "ai", true);
        console.error(error);
    }

    input.disabled = false;

    if (window.innerWidth > 768) {
        input.focus();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadThreads();
    const input = document.getElementById("message");

    if(input) {
        input.addEventListener("keypress", (event) => {
            if(event.key === "Enter"){
                event.preventDefault();
                sendMessage();
                input.blur(); 
            }
        });
    }

    const clearBtn = document.getElementById("clear-history");
    if(clearBtn){
        clearBtn.onclick = clearHistory;
    }
});

// ==========================================
// 🌟 SWIPE & CLICK OUTSIDE TO CLOSE SIDEBAR
// ==========================================
let touchStartX = 0;
let touchEndX = 0;

const sidebarElement = document.getElementById('sidebar');
const menuButton = document.querySelector('.menu-btn');

// ১. বাইরে ক্লিক করলে সাইডবার বন্ধ করার লজিক
document.addEventListener('click', function(event) {
    if (sidebarElement && sidebarElement.classList.contains('open')) {
        // ক্লিক যদি সাইডবার বা মেনু বাটনের ভেতরে না হয়, তবেই বন্ধ হবে
        if (!sidebarElement.contains(event.target) && (!menuButton || !menuButton.contains(event.target))) {
            sidebarElement.classList.remove('open');
        }
    }
});

// ২. হাত দিয়ে স্লাইড (Swipe Left) করলে সাইডবার বন্ধ করার লজিক
document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    if (sidebarElement && sidebarElement.classList.contains('open')) {
        // যদি ইউজার ডান থেকে বাম দিকে অন্তত ৫০ পিক্সেল স্লাইড করে
        if (touchStartX - touchEndX > 50) {
            sidebarElement.classList.remove('open');
        }
    }
}
