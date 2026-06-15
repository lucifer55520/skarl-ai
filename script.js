let conversationThreads = []; 
let activeThreadIndex = -1;
let selectedImageBase64 = null; 

let contextMenuThreadIndex = -1;
let longPressTimer;
let isLongPress = false;

let touchStartX = 0;
let touchEndX = 0;

let recognition;
let isListening = false;

const API_URL = "https://suryabiswas018-skarl-ai.hf.space/chat";

// ==========================================
// 🚀 INITIALIZATION & EVENT LISTENERS
// ==========================================
window.onload = function() {
    // শুধু চ্যাট হিস্ট্রি লোড করবে, লগইন চেক করবে auth.js
    loadThreads();

    // Voice Input Button Binding
    const voiceInputBtn = document.getElementById('voice-input-btn');
    if (voiceInputBtn) voiceInputBtn.onclick = startVoiceInput;

    // Enter Key Binding for Message Input
    const messageInput = document.getElementById('message');
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
                messageInput.blur();
            }
        });
    }

    // Clear History Button Binding
    const clearBtn = document.getElementById("clear-history"); 
    if(clearBtn) clearBtn.onclick = clearHistory;

    // Context Menu Pin Button
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

    // Context Menu Delete Button
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

    // Global Click Event for closing Context Menu & Sidebar
    document.addEventListener('click', (e) => {
        const contextMenu = document.getElementById("thread-context-menu");
        if (contextMenu && contextMenu.style.display === "flex") {
            if (!contextMenu.contains(e.target)) contextMenu.style.display = "none";
        }

        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.querySelector('.menu-btn');
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) sidebar.classList.remove('open');
        }
    });

    // Touch Events for Mobile Sidebar Swipe
    document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSidebarSwipe();
    }, { passive: true });
};

// ==========================================
// 🖥️ UI CONTROLS & SIDEBAR SWIPE
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function closeModal() {
    const confirmModal = document.getElementById('custom-confirm');
    if(confirmModal) confirmModal.classList.remove('active');
}

function handleSidebarSwipe() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const swipeThreshold = 50; 
    const diffX = touchEndX - touchStartX;
    const isOpen = sidebar.classList.contains('open');

    // Swipe Right to open
    if (diffX > swipeThreshold && !isOpen && touchStartX < 100) sidebar.classList.add('open');
    // Swipe Left to close
    else if (diffX < -swipeThreshold && isOpen) sidebar.classList.remove('open');
}

// ==========================================
// 📸 IMAGE UPLOAD LOGIC
// ==========================================
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

// ==========================================
// 💬 CHAT HISTORY & RENDERING LOGIC
// ==========================================
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
            textContainer.innerHTML = marked.parse(text); // Converts markdown
        } else {
            textContainer.innerHTML = text.replace(/\n/g, '<br>');
        }
        div.appendChild(textContainer);
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

        // Mobile Long Press Logic
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
    activeThreadIndex = index; 
    const chat = document.getElementById("chat"); 
    chat.innerHTML = "";
    conversationThreads[index].messages.forEach(msg => { appendMessage(msg.text, msg.sender, false, msg.image); });
    renderSidebar();
    if (window.innerWidth <= 768) { 
        const sidebar = document.getElementById('sidebar'); 
        if (sidebar.classList.contains('open')) sidebar.classList.remove('open'); 
    }
}

function startNewChat() {
    activeThreadIndex = -1; document.getElementById("chat").innerHTML = ""; renderSidebar(); 
    if (window.innerWidth <= 768) { 
        const sidebar = document.getElementById('sidebar'); 
        if (sidebar.classList.contains('open')) sidebar.classList.remove('open'); 
    }
}

function clearHistory(){ 
    const confirmModal = document.getElementById('custom-confirm');
    if(confirmModal) confirmModal.classList.add('active'); 
}

function confirmClear(){
    conversationThreads = []; activeThreadIndex = -1; localStorage.removeItem("skyAiConversationThreads");
    document.getElementById("chat").innerHTML = ""; renderSidebar(); closeModal(); 
}

// ==========================================
// 🎤 VOICE RECOGNITION LOGIC
// ==========================================
function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        alert("Voice input requires an HTTPS connection to work on a public domain.");
        return;
    }

    if (!SpeechRecognition) {
        alert("Your browser does not support Web Speech API. Please use Google Chrome.");
        return;
    }

    if (isListening) {
        stopVoiceInput();
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const messageInput = document.getElementById('message');
    const voiceInputBtn = document.getElementById('voice-input-btn');

    recognition.onstart = function() {
        isListening = true;
        voiceInputBtn.classList.add('listening');
        messageInput.placeholder = "Listening...";
    };

    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        messageInput.value = finalTranscript || interimTranscript;
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error:", event.error);
        stopVoiceInput();
        alert("Speech recognition error: " + event.error);
    };

    recognition.onend = function() {
        stopVoiceInput();
    };

    recognition.start();
}

function stopVoiceInput() {
    if (recognition && isListening) {
        recognition.stop();
        isListening = false;
        document.getElementById('voice-input-btn').classList.remove('listening');
        document.getElementById('message').placeholder = "Ask anything...";
    }
}

// ==========================================
// 🚀 MESSAGE SENDING LOGIC TO SERVER
// ==========================================
async function sendMessage() {
    stopVoiceInput();
    const input = document.getElementById("message");
    let userText = input.value.trim();

    if (!userText && !selectedImageBase64) return;
    if (!userText && selectedImageBase64) userText = "Please analyze this image and explain what you see.";

    const currentImg = selectedImageBase64;
    input.value = "";
    removeImage();

    appendMessage(userText, "user", false, currentImg);

    if (activeThreadIndex === -1) {
        conversationThreads.unshift({
            title: userText.substring(0, 30) + (userText.length > 30 ? "..." : ""),
            messages: [],
            isPinned: false
        });
        activeThreadIndex = 0;
    }

    const thread = conversationThreads[activeThreadIndex];
    const history = thread.messages.map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
    }));

    thread.messages.push({ text: userText, sender: "user", image: currentImg });
    saveThreads();

    // Show typing indicator
    const aiWrapper = appendMessage("Thinking...", "ai");
    const aiTextContainer = aiWrapper.querySelector(".ai-message div");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText, history: history, image: currentImg }) 
        });

        if (!response.ok) throw new Error("Failed to connect to Skarl AI.");

        const data = await response.json();

        // Update the AI message box directly
        aiTextContainer.innerHTML = marked.parse(data.reply);
        thread.messages.push({ text: data.reply, sender: "ai" });
        saveThreads();

    } catch (error) {
        aiTextContainer.innerText = "Connection Error: " + error.message;
        aiTextContainer.parentElement.classList.add("error-message");
    }
}
