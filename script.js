let conversationThreads = []; // 🌟 Typo fixed ('Let' থেকে 'let' করা হয়েছে)
let activeThreadIndex = -1;

const API_URL = "https://suryabiswas018-skarl-ai.hf.space/chat";

function appendMessage(text, sender, isError = false) {
    const chat = document.getElementById("chat");
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-message" : "ai-message";
    if (isError) {
        div.classList.add("error-message");
    }
    div.innerText = text;
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
        appendMessage(msg.text, msg.sender);
    });
    renderSidebar();

    // 🌟 মোবাইল ভার্সনে চ্যাট সিলেক্ট করার পর সাইডবার অটোমেটিক বন্ধ হয়ে যাবে
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }
}

// 🌟 নতুন চ্যাট শুরু করার ফাংশন যোগ করা হলো
function startNewChat() {
    activeThreadIndex = -1; 
    document.getElementById("chat").innerHTML = ""; 
    renderSidebar(); 

    // মোবাইল ভার্সনে নতুন চ্যাট শুরু করলে সাইডবার বন্ধ হয়ে যাবে
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }
}

// ব্রাউজারের অ্যালার্ট বন্ধ করে আমাদের নতুন মডাল ওপেন করার ফাংশন
function clearHistory(){
    document.getElementById('custom-confirm').classList.add('active');
}

// পপ-আপের "Delete" বাটনে ক্লিক করলে হিস্ট্রি মুছবে
function confirmClear(){
    conversationThreads = [];
    activeThreadIndex = -1;
    localStorage.removeItem("skyAiConversationThreads");
    document.getElementById("chat").innerHTML = "";
    renderSidebar();
    closeModal(); // কাজ শেষে মডাল বন্ধ করে দেবে
}

async function sendMessage(){
    const input = document.getElementById("message");
    const userText = input.value.trim();

    if(!userText || input.disabled){
        return;
    }

    input.disabled = true;

    if(activeThreadIndex === -1){
        conversationThreads.push({
            title: userText.substring(0,25),
            messages: []
        });
        activeThreadIndex = conversationThreads.length - 1;
    }

    appendMessage(userText, "user");
    conversationThreads[activeThreadIndex].messages.push({
        text: userText,
        sender: "user"
    });

    input.value = "";
    const typing = appendMessage("Thinking...", "ai");

    // 🌟 এআই যেন আগের কথা মনে রাখতে পারে, তাই আগের মেসেজগুলো সার্ভারে পাঠানোর ব্যবস্থা
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
                history: historyForApi // 🌟 হিস্ট্রি সার্ভারে পাঠানো হচ্ছে
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

    // 🌟 Keyboard fix: Only focus on desktop, not on mobile
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
