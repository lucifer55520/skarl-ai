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

// 🌟 NEW: Smart Generation & Voice Variables
let isGeneratingText = false;
let isSpeakingTTS = false;
let abortController = null;
let stopTypingFlag = false;
let lastInputWasVoice = false; // টাইপিং নাকি ভয়েস, তা ট্র্যাক করার জন্য

const API_URL = "https://suryabiswas018-skarl-ai.hf.space/chat";

// ==========================================
// 🚀 INITIALIZATION & EVENT LISTENERS
// ==========================================
window.onload = function() {
    loadThreads();

    const voiceInputBtn = document.getElementById('voice-input-btn');
    if (voiceInputBtn) voiceInputBtn.onclick = startVoiceInput;

    const messageInput = document.getElementById('message');
    if (messageInput) {
        // 🌟 ইউজার নিজে হাতে কিছু টাইপ করলে ভয়েস ফ্ল্যাগটি false হয়ে যাবে
        messageInput.addEventListener('input', () => {
            if (!isListening) lastInputWasVoice = false; 
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                toggleSendStop(); 
                messageInput.blur();
            }
        });
    }

    const clearBtn = document.getElementById("clear-history"); 
    if(clearBtn) clearBtn.onclick = clearHistory;

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

    if (diffX > swipeThreshold && !isOpen && touchStartX < 100) sidebar.classList.add('open');
    else if (diffX < -swipeThreshold && isOpen) sidebar.classList.remove('open');
}

// ==========================================
// 📸 SMART IMAGE COMPRESSOR & UPLOAD LOGIC
// ==========================================
document.getElementById('image-upload')?.addEventListener('change', function(e) {
    const file = e.target.files[0]; 
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width; canvas.height = height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            selectedImageBase64 = canvas.toDataURL("image/jpeg", 0.7); 

            document.getElementById('preview-container').style.display = 'block';
            document.getElementById('image-preview').src = selectedImageBase64;
        };
        img.src = event.target.result;
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
        img.src = imgSrc; 
        img.className = "user-img-msg"; 
        div.appendChild(img);
    }

    if (text) {
        const textContainer = document.createElement("div");
        if (sender === "ai" && !isError) {
            textContainer.innerHTML = marked.parse(text); 
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
    try { localStorage.setItem("skyAiConversationThreads", JSON.stringify(conversationThreads)); } 
    catch (e) { console.warn("⚠️ LocalStorage limit reached! Cannot save more history."); }
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
    if (isGeneratingText || isSpeakingTTS) stopGeneration(); 
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
    if (isGeneratingText || isSpeakingTTS) stopGeneration(); 
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
    if (isGeneratingText || isSpeakingTTS) stopGeneration();
    conversationThreads = []; activeThreadIndex = -1; localStorage.removeItem("skyAiConversationThreads");
    document.getElementById("chat").innerHTML = ""; renderSidebar(); closeModal(); 
}

// ==========================================
// 🎤 VOICE RECOGNITION LOGIC
// ==========================================
function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        alert("Voice input requires an HTTPS connection to work on a public domain."); return;
    }
    if (!SpeechRecognition) {
        alert("Your browser does not support Web Speech API. Please use Google Chrome."); return;
    }
    if (isListening) {
        stopVoiceInput(); return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';

    const messageInput = document.getElementById('message');
    const voiceInputBtn = document.getElementById('voice-input-btn');

    recognition.onstart = function() {
        isListening = true; voiceInputBtn.classList.add('listening'); messageInput.placeholder = "Listening...";
    };

    recognition.onresult = function(event) {
        let interimTranscript = ''; let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            else interimTranscript += event.results[i][0].transcript;
        }
        messageInput.value = finalTranscript || interimTranscript;
        
        // 🌟 ইউজার ভয়েস ব্যবহার করেছে, তাই ফ্ল্যাগটি true করা হলো
        lastInputWasVoice = true; 
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error:", event.error); stopVoiceInput();
        alert("Speech recognition error: " + event.error);
    };

    recognition.onend = function() { stopVoiceInput(); };
    recognition.start();
}

function stopVoiceInput() {
    if (recognition && isListening) {
        recognition.stop(); isListening = false;
        document.getElementById('voice-input-btn').classList.remove('listening');
        document.getElementById('message').placeholder = "Ask anything...";
    }
}

// ==========================================
// 🚀 DYNAMIC STOP/SEND LOGIC (FIXED)
// ==========================================
function toggleSendStop() {
    // 🌟 টেক্সট লেখা অথবা মুখে বলা যেকোনো একটা চললেই Stop বাটন কাজ করবে
    if (isGeneratingText || isSpeakingTTS) {
        stopGeneration();
    } else {
        sendMessage();
    }
}

function updateSendButtonUI() {
    const sendIcon = document.getElementById('send-icon');
    const stopIcon = document.getElementById('stop-icon');

    if(sendIcon && stopIcon) {
        // 🌟 লেখা শেষ হলেও যদি ভয়েস চলতে থাকে, তবে Stop বাটনটি থেকে যাবে!
        if (isGeneratingText || isSpeakingTTS) {
            sendIcon.style.display = 'none';
            stopIcon.style.display = 'block';
        } else {
            sendIcon.style.display = 'block';
            stopIcon.style.display = 'none';
        }
    }
}

function stopGeneration() {
    if (abortController) abortController.abort(); 
    stopTypingFlag = true;
    isGeneratingText = false;
    isSpeakingTTS = false;
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // 🔊 ভয়েস সাথে সাথে বন্ধ করে দেবে
    }
    
    updateSendButtonUI();
}

// ==========================================
// 🚀 MESSAGE SENDING, TYPEWRITER & TEXT-TO-SPEECH
// ==========================================
async function sendMessage() {
    stopVoiceInput();
    const input = document.getElementById("message");
    let userText = input.value.trim();

    if (!userText && !selectedImageBase64) return;
    if (!userText && selectedImageBase64) userText = "Please analyze this image and explain what you see.";

    const currentImg = selectedImageBase64;
    
    // 🌟 এই মেসেজটিতে ইউজার ভয়েস ব্যবহার করেছিল কি না, সেটি সেভ রাখা হচ্ছে
    let usedVoice = lastInputWasVoice; 
    lastInputWasVoice = false; // পরের মেসেজের জন্য ফ্ল্যাগ আবার রিসেট করে দেওয়া হলো

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

    const aiWrapper = appendMessage("Thinking...", "ai");
    const aiTextContainer = aiWrapper.querySelector(".ai-message div");

    const currentThreadIndexAtStart = activeThreadIndex;

    // 🌟 Set UI to Generating mode
    isGeneratingText = true;
    stopTypingFlag = false;
    updateSendButtonUI();
    abortController = new AbortController();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText, history: history, image: currentImg }),
            signal: abortController.signal // 🌟 Attach abort signal
        });

        if (!response.ok) throw new Error("Failed to connect to Skarl AI Server.");

        const data = await response.json();
        let fullReply = data.reply;

        // 🔊 Text-To-Speech Logic (🌟 শুধুমাত্র ভয়েসে প্রশ্ন করলেই এটি বাজবে)
        if (usedVoice && !stopTypingFlag && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            let cleanText = fullReply.replace(/[*#`_]/g, ''); 
            const utterance = new SpeechSynthesisUtterance(cleanText);
            const isBengali = /[\u0980-\u09FF]/.test(cleanText);
            utterance.lang = isBengali ? 'bn-IN' : 'en-US';
            utterance.rate = 1.0; 
            
            // 🌟 ভয়েস শুরু হলে Stop বাটন অন থাকবে, শেষ হলে অফ হবে
            utterance.onstart = function() {
                isSpeakingTTS = true;
                updateSendButtonUI();
            };
            utterance.onend = function() {
                isSpeakingTTS = false;
                updateSendButtonUI();
            };
            utterance.onerror = function() {
                isSpeakingTTS = false;
                updateSendButtonUI();
            };

            window.speechSynthesis.speak(utterance);
        } else {
            isSpeakingTTS = false; // যদি ভয়েস ব্যবহার না করে, তবে এটি false থাকবে
        }

        // 🌟 TYPEWRITER ANIMATION 
        aiTextContainer.innerHTML = ""; 
        let i = 0;
        let currentText = "";

        function typeWriter() {
            // If user clicked Stop or switched chats during typing
            if (activeThreadIndex !== currentThreadIndexAtStart || stopTypingFlag) {
                window.speechSynthesis.cancel(); 
                isGeneratingText = false;
                isSpeakingTTS = false;
                updateSendButtonUI();

                // Save whatever was typed so far to history
                if (stopTypingFlag && activeThreadIndex === currentThreadIndexAtStart) {
                    thread.messages.push({ text: currentText + " 🛑 [Stopped]", sender: "ai" });
                    saveThreads();
                }
                return; 
            }

            if (i < fullReply.length) {
                let chunkSize = Math.floor(Math.random() * 3) + 2; 
                currentText += fullReply.substring(i, i + chunkSize);
                aiTextContainer.innerHTML = marked.parse(currentText);

                const chatBox = document.getElementById("chat");
                chatBox.scrollTop = chatBox.scrollHeight;

                i += chunkSize;
                setTimeout(typeWriter, 15); 
            } else {
                // Done generating
                isGeneratingText = false;
                updateSendButtonUI(); // 🌟 টাইপ শেষ হলে চেক করবে যে ভয়েস চলছে কি না
                thread.messages.push({ text: fullReply, sender: "ai" });
                saveThreads();
            }
        }
        typeWriter();

    } catch (error) {
        // Handle Abort cleanly without showing a scary error
        if (error.name === 'AbortError') {
            aiTextContainer.innerHTML = "<em>Generation stopped by user. 🛑</em>";
            thread.messages.push({ text: "Generation stopped by user.", sender: "ai" });
            saveThreads();
        } else {
            aiTextContainer.innerText = "Connection Error: " + error.message;
            aiTextContainer.parentElement.classList.add("error-message");
        }
        isGeneratingText = false;
        isSpeakingTTS = false;
        updateSendButtonUI();
    }
}
