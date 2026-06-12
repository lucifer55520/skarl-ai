let conversationThreads = [];
let activeThreadIndex = -1;

// Helper to append messages to the UI
function appendMessage(text, sender, isError = false) {
    let chat = document.getElementById("chat");
    let wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    
    let div = document.createElement("div");
    div.className = sender === "user" ? "user-message" : "ai-message";
    if (isError) div.classList.add("error-message");
    div.innerText = text;
    
    wrapper.appendChild(div);
    chat.appendChild(wrapper);
    chat.scrollTop = chat.scrollHeight;
    return wrapper;
}

// Save to LocalStorage
function saveThreads() {
    localStorage.setItem("skyAiConversationThreads", JSON.stringify(conversationThreads));
    renderSidebar();
}

// Load from LocalStorage
function loadThreads() {
    const stored = localStorage.getItem("skyAiConversationThreads");
    if (stored) {
        conversationThreads = JSON.parse(stored);
        renderSidebar();
    }
}

// Render the sidebar list
function renderSidebar() {
    const list = document.getElementById("history-list");
    list.innerHTML = "";
    conversationThreads.forEach((thread, index) => {
        const item = document.createElement("div");
        item.className = `history-item ${index === activeThreadIndex ? 'active' : ''}`;
        item.innerText = thread.title || "Untitled Chat";
        item.onclick = () => loadThreadIntoChat(index);
        list.appendChild(item);
    });
}

// Switch between chats
function loadThreadIntoChat(index) {
    activeThreadIndex = index;
    const chat = document.getElementById("chat");
    chat.innerHTML = "";
    
    conversationThreads[index].messages.forEach(msg => {
        appendMessage(msg.text, msg.sender);
    });
    
    renderSidebar();
    document.getElementById("message").focus();
}

// Clear everything
function clearHistory() {
    if (confirm("Are you sure you want to delete all history?")) {
        conversationThreads = [];
        activeThreadIndex = -1;
        localStorage.removeItem("skyAiConversationThreads");
        document.getElementById("chat").innerHTML = "";
        renderSidebar();
        
        // Reset UI state
        let input = document.getElementById("message");
        let statusTag = document.getElementById("status-tag");
        input.disabled = false;
        input.placeholder = "Ask something...";
        statusTag.innerText = "SYSTEM READY";
        statusTag.style.color = "#4ade80";
    }
}

async function sendMessage(){
    let input = document.getElementById("message");
    let chat = document.getElementById("chat");
    let statusTag = document.getElementById("status-tag");
    let userText = input.value.trim();
    
    // Prevent sending if empty or if a request is already in progress
    if(userText === "" || input.disabled){
        return;
    }
    
    // Disable input to prevent concurrent requests
    input.disabled = true;
    input.placeholder = "Sky AI is thinking...";
    statusTag.innerText = "PROCESSING REQUEST...";
    statusTag.style.color = "#fbbf24"; // Amber for processing

    // Handle history logic for new threads
    if (activeThreadIndex === -1) {
        conversationThreads.push({
            title: userText.length > 25 ? userText.substring(0, 25) + "..." : userText,
            messages: []
        });
        activeThreadIndex = conversationThreads.length - 1;
    }

    // Add user message to UI and History
    appendMessage(userText, "user");
    conversationThreads[activeThreadIndex].messages.push({ text: userText, sender: "user" });
    
    input.value = ""; // Clear input immediately after sending user message
    
    // Create a typing indicator
    let typingIndicatorWrapper = document.createElement("div");
    typingIndicatorWrapper.className = "message-wrapper";
    let typingIndicator = document.createElement("div");
    typingIndicator.className = "ai-message typing-indicator"; // Add a new class for specific styling
    typingIndicator.innerHTML = '<span></span><span></span><span></span>'; // For animated dots
    typingIndicatorWrapper.appendChild(typingIndicator);
    chat.appendChild(typingIndicatorWrapper);
    
    chat.scrollTop = chat.scrollHeight;
    
    try {
        // Fetch response from the Python backend
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: userText })
        });

        // Re-enable input for the next message
        input.disabled = false;
        input.placeholder = "Ask something...";
        statusTag.innerText = "SYSTEM READY";
        statusTag.style.color = "#4ade80"; // Green for idle

        const data = await response.json();

        if (!response.ok) {
            if (chat.contains(typingIndicatorWrapper)) chat.removeChild(typingIndicatorWrapper);
            appendMessage(`Server Error: ${data.reply || "Unknown error"}`, "ai", true);
            return;
        }
        
        // Remove typing indicator and show the actual AI response
        if (chat.contains(typingIndicatorWrapper)) chat.removeChild(typingIndicatorWrapper);

        // Add AI response to UI and History
        appendMessage(data.reply, "ai");
        conversationThreads[activeThreadIndex].messages.push({ text: data.reply, sender: "ai" });
        
        saveThreads(); // Persist to localStorage
        
        input.focus();
    } catch (error) {
        console.error("Error communicating with backend:", error);
        if (chat.contains(typingIndicatorWrapper)) {
            chat.removeChild(typingIndicatorWrapper);
        }
        input.disabled = false;
        input.placeholder = "Ask something...";
        statusTag.innerText = "CONNECTION ERROR";
        statusTag.style.color = "#ef4444"; // Red for error

        appendMessage("Connection lost. Make sure to access the app via http://127.0.0.1:8000 and that the backend is running.", "ai", true);
    }
    
    chat.scrollTop = chat.scrollHeight;
}

// Add event listener for Enter key to send message
document.getElementById("message").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent default Enter key behavior (e.g., new line)
        sendMessage();
    }
});

// Initialize history on page load
document.addEventListener("DOMContentLoaded", () => {
    loadThreads();
    document.getElementById("clear-history").addEventListener("click", clearHistory);
});