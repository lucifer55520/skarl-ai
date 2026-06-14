let conversationThreads = []; 
let activeThreadIndex = -1;
let selectedImageBase64 = null; 

let contextMenuThreadIndex = -1;
let longPressTimer;
let isLongPress = false;

const API_URL = "https://suryabiswas018-skarl-ai.hf.space/chat";

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
    if (user === "" || pass === "") { alert("Please enter both username and password!"); return; }
    localStorage.setItem("skarl_user", user);
    localStorage.setItem("skarl_pass", pass);
    document.getElementById("login-modal").style.display = "none";
    document.getElementById("system-ready-badge").style.display = "none";
    let icon = document.getElementById("user-profile-icon");
    if(icon) { icon.innerText = getInitials(user); icon.style.display = "flex"; }
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
    localStorage.removeItem("skarl_user"); localStorage.removeItem("skarl_pass"); location.reload(); 
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function closeModal() {
    const confirmModal = document.getElementById('custom-confirm');
    if(confirmModal) confirmModal.classList.remove('active');
}

document.getElementById('image-upload')?.addEventListener('change', function(e) {
    const file = e.target.files[0]; if (!file) return;
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

// 🌟 MARKDOWN PARSER IMPLEMENTED HERE
function appendMessage(text, sender, isError = false, imgSrc = null) {
    const chat = document.getElementById("chat");
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-message" : "ai-message";
    if (isError) div.classList.add("error-message");
    
    if (imgSrc && sender === "user") {
        const img = document.createElement("img");
        img.src = imgSrc; img.className = "user-img-msg"; div.appendChild(img);
    }
    
    if (text) {
        const textContainer = document.createElement("div");
        
        if (sender === "ai" && !isError) {
            // এআই এর উত্তরের জন্য Markdown Parser ব্যবহার করা হলো
            textContainer.innerHTML = marked.parse(text);
        } else {
            // ইউজারের মেসেজ বা সিম্পল এরর এর জন্য নরমাল ব্রেক (<br>)
            textContainer.innerHTML = text.replace(/\n/g, '<br>');
        }
        
        div.appendChild(textContainer);
    }
    
    wrapper.appendChild(div); chat.appendChild(wrapper); chat.scrollTop = chat.scrollHeight; return wrapper;
}

function saveThreads() { 
    localStorage.setItem("skyAiConversationThreads", JSON.stringify(conversationThreads)); 
    renderSidebar(); 
}

function loadThreads() {
    const stored = localStorage.getItem("skyAiConversationThreads");
    if (stored) { conversationThreads = JSON.parse(stored); renderSidebar(); }
}

function renderSidebar() {
    const list = document.getElementById("history-list"); if (!list) return; list.innerHTML = "";
    
    let currentActiveThread = activeThreadIndex >= 0 ? conversationThreads[activeThreadIndex] : null;
    
    conversationThreads.sort((a, b) => {
        let pinA = a.isPinned ? 1 : 0;
        let pinB = b.isPinned ? 1 : 0;
        return pinB - pinA;
    });

    if (currentActiveThread) {
        activeThreadIndex = conversationThreads.indexOf(currentActiveThread);
    }

    conversationThreads.forEach((thread, index) => {
        const item = document.createElement("div");
        item.className = `history-item ${index === activeThreadIndex ? "active" : ""}`;
        if (thread.isPinned) item.classList.add("pinned");
        
        item.innerText = thread.title || "Untitled Chat";

        item.onclick = (e) => {
            if (isLongPress) { e.preventDefault(); return; }
            loadThreadIntoChat(index);
        };

        item.oncontextmenu = (e) => {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, index);
        };

        item.ontouchstart = (e) => {
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                let touch = e.touches[0];
                showContextMenu(touch.clientX, touch.clientY, index);
            }, 600);
        };
        item.ontouchend = () => clearTimeout(longPressTimer);
        item.ontouchmove = () => clearTimeout(longPressTimer);

        list.appendChild(item);
    });
}

function showContextMenu(x, y, index) {
    contextMenuThreadIndex = index;
    const menu = document.getElementById("thread-context-menu");
    const isPinned = conversationThreads[index].isPinned;
    document.getElementById("btn-pin-menu").innerText = isPinned ? "❌ Unpin from Top" : "📌 Pin to Top";

    menu.style.display = "flex";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
}

function loadThreadIntoChat(index){
    activeThreadIndex = index; const chat = document.getElementById("chat"); chat.innerHTML = "";
    conversationThreads[index].messages.forEach(msg => { appendMessage(msg.text, msg.sender, false, msg.image); });
    renderSidebar();
    if (window.innerWidth <= 768) { const sidebar = document.getElementById('sidebar'); if (sidebar.classList.contains('open')) sidebar.classList.remove('open'); }
}

function startNewChat() {
    activeThreadIndex = -1; document.getElementById("chat").innerHTML = ""; renderSidebar(); 
    if (window.innerWidth <= 768) { const sidebar = document.getElementById('sidebar'); if (sidebar.classList.contains('open')) sidebar.classList.remove('open'); }
}

function clearHistory(){ 
    const confirmModal = document.getElementById('custom-confirm');
    if(confirmModal) confirmModal.classList.add('active'); 
}

function confirmClear(){
    conversationThreads = []; activeThreadIndex = -1; localStorage.removeItem("skyAiConversationThreads");
    document.getElementById("chat").innerHTML = ""; renderSidebar(); closeModal(); 
}

async function sendMessage(){
    const input = document.getElementById("message"); let userText = input.value.trim();
    if(!userText && selectedImageBase64) { userText = "Please analyze this image and explain what you see."; } else if(!userText || input.disabled){ return; }
    input.disabled = true;

    if(activeThreadIndex === -1){
        conversationThreads.push({ 
            title: userText.substring(0,25) || "Image Analysis", 
            messages: [],
            isPinned: false
        });
        activeThreadIndex = conversationThreads.length - 1;
    }

    appendMessage(userText, "user", false, selectedImageBase64);
    conversationThreads[activeThreadIndex].messages.push({ text: userText, sender: "user", image: selectedImageBase64 });

    const imageToSend = selectedImageBase64; input.value = ""; removeImage(); 
    const typing = appendMessage("Thinking...", "ai");

    const currentThread = conversationThreads[activeThreadIndex].messages;
    const historyForApi = currentThread.slice(0, -1).map(msg => ({ role: msg.sender === "user" ? "user" : "assistant", content: msg.text }));

    try{
        const response = await fetch(API_URL, {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ message: userText, history: historyForApi, image: imageToSend })
        });
        const data = await response.json(); typing.remove();
        if(!response.ok) throw new Error(data.detail || "Server error");
        appendMessage(data.reply, "ai");
        conversationThreads[activeThreadIndex].messages.push({ text: data.reply, sender: "ai" });
        saveThreads();
    }
    catch(error){ typing.remove(); appendMessage("Connection error: " + error.message, "ai", true); console.error(error); }
    input.disabled = false;
    if (window.innerWidth > 768) input.focus();
}

document.addEventListener("DOMContentLoaded", () => {
    loadThreads();
    const input = document.getElementById("message");
    if(input) { input.addEventListener("keypress", (event) => { if(event.key === "Enter"){ event.preventDefault(); sendMessage(); input.blur(); }}); }
    const clearBtn = document.getElementById("clear-history"); if(clearBtn) clearBtn.onclick = clearHistory;

    const pinBtn = document.getElementById("btn-pin-menu");
    if (pinBtn) {
        pinBtn.onclick = () => {
            if (contextMenuThreadIndex > -1) {
                conversationThreads[contextMenuThreadIndex].isPinned = !conversationThreads[contextMenuThreadIndex].isPinned;
                document.getElementById("thread-context-menu").style.display = "none";
                saveThreads();
            }
        };
    }

    const deleteBtn = document.getElementById("btn-delete-menu");
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            if (contextMenuThreadIndex > -1) {
                if (contextMenuThreadIndex === activeThreadIndex) startNewChat(); 
                conversationThreads.splice(contextMenuThreadIndex, 1); 
                
                if (contextMenuThreadIndex < activeThreadIndex) activeThreadIndex--;
                else if (contextMenuThreadIndex === activeThreadIndex) activeThreadIndex = -1;
                
                document.getElementById("thread-context-menu").style.display = "none";
                saveThreads();
            }
        };
    }

    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.menu-btn');
    const contextMenu = document.getElementById("thread-context-menu");
    let touchStartX = 0; let touchEndX = 0;

    document.addEventListener('click', (e) => {
        if (contextMenu && contextMenu.style.display === "flex") {
            if (!contextMenu.contains(e.target)) contextMenu.style.display = "none";
        }
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) sidebar.classList.remove('open');
        }
    });

    document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        if (window.innerWidth <= 768 && sidebar) {
            let swipeDistance = touchStartX - touchEndX;
            if (swipeDistance > 50 && sidebar.classList.contains('open')) sidebar.classList.remove('open');
            else if (swipeDistance < -50 && touchStartX < 100 && !sidebar.classList.contains('open')) sidebar.classList.add('open');
        }
    }, {passive: true});
});
