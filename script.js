let conversationThreads = []; 
let activeThreadIndex = -1;
let selectedImageBase64 = null; // 🌟 আপলোড করা ছবি স্টোর করে রাখার জন্য নতুন ভেরিয়েবল

const API_URL = "https://suryabiswas018-skarl-ai.hf.space/chat";

// 🌟 ছবি আপলোড হলে সেটি স্ক্রিনে দেখানোর লজিক
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

// 🌟 আপলোড করা ছবি ক্যানসেল (X) করার ফাংশন
function removeImage() {
    selectedImageBase64 = null;
    const uploadInput = document.getElementById('image-upload');
    if (uploadInput) uploadInput.value = "";
    document.getElementById('preview-container').style.display = 'none';
}

// 🌟 চ্যাটে ছবি ও টেক্সট দেখানোর জন্য আপডেটেড appendMessage ফাংশন
function appendMessage(text, sender, isError = false, imgSrc = null) {
    const chat = document.getElementById("chat");
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-message" : "ai-message";
    
    if (isError) {
        div.classList.add("error-message");
    }

    // 🌟 ইউজারের মেসেজে যদি ছবি থাকে, তবে তা চ্যাট বক্সে দেখাবে
    if (imgSrc && sender === "user") {
        const img = document.createElement("img");
        img.src = imgSrc;
        img.className = "user-img-msg";
        div.appendChild(img);
    }
    
    // টেক্সট বসানো
    if (text) {
        const textSpan = document.createElement("span");
        textSpan.innerText = text;
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
        // 🌟 পুরনো চ্যাট লোড করার সময় ছবিও দেখাবে
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

    // 🌟 যদি ইউজার শুধু ছবি সিলেক্ট করে কিন্তু কিছু না লেখে, তবে ডিফল্ট টেক্সট পাঠাবে
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

    // 🌟 ইউজারের চ্যাটবক্সে ছবি ও মেসেজ শো করানো
    appendMessage(userText, "user", false, selectedImageBase64);
    
    // হিস্ট্রিতে স্টোর করা
    conversationThreads[activeThreadIndex].messages.push({
        text: userText,
        sender: "user",
        image: selectedImageBase64 // 🌟 লোকাল স্টোরেজে ছবি সেভ করা হচ্ছে
    });

    const imageToSend = selectedImageBase64; // এপিআইতে পাঠানোর জন্য ভেরিয়েবলে রাখা
    input.value = "";
    removeImage(); // ছবি পাঠানোর পর প্রিভিউ থেকে ডিলিট করে দেওয়া

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
                image: imageToSend // 🌟 ছবি সার্ভারে পাঠানো হচ্ছে
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

    // Keyboard fix
    if (window.innerWidth > 768) {
        input.focus();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadThreads();
    const input = document.getElementById("message");

    input.addEventListener("keypress", (event) => {
        if(event.key === "Enter"){
            event.preventDefault();
            sendMessage();
            input.blur(); 
        }
    });

    const clearBtn = document.getElementById("clear-history");
    if(clearBtn){
        clearBtn.onclick = clearHistory;
    }
});
