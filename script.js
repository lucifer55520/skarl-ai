let conversationThreads = [];
let activeThreadIndex = -1;

// Hugging Face FastAPI backend
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


// Save chat history
function saveThreads() {
    localStorage.setItem(
        "skyAiConversationThreads",
        JSON.stringify(conversationThreads)
    );

    renderSidebar();
}


// Load history
function loadThreads() {
    const stored =
        localStorage.getItem("skyAiConversationThreads");

    if (stored) {
        conversationThreads = JSON.parse(stored);
        renderSidebar();
    }
}


// Sidebar
function renderSidebar() {

    const list = document.getElementById("history-list");

    if (!list) return;

    list.innerHTML = "";

    conversationThreads.forEach((thread,index)=>{

        const item=document.createElement("div");

        item.className =
        `history-item ${
            index===activeThreadIndex ? "active" : ""
        }`;

        item.innerText =
        thread.title || "Untitled Chat";


        item.onclick=()=>{
            loadThreadIntoChat(index);
        };


        list.appendChild(item);

    });
}


// Load old chat
function loadThreadIntoChat(index){

    activeThreadIndex=index;

    const chat=document.getElementById("chat");

    chat.innerHTML="";


    conversationThreads[index]
    .messages
    .forEach(msg=>{

        appendMessage(
            msg.text,
            msg.sender
        );

    });


    renderSidebar();

}


// Clear history
function clearHistory(){

    if(confirm("Delete all history?")){

        conversationThreads=[];
        activeThreadIndex=-1;


        localStorage.removeItem(
            "skyAiConversationThreads"
        );


        document.getElementById("chat")
        .innerHTML="";


        renderSidebar();

    }

}



// Send message
async function sendMessage(){

    const input=document.getElementById("message");

    const userText=input.value.trim();


    if(!userText || input.disabled){
        return;
    }



    input.disabled=true;


    // New chat
    if(activeThreadIndex===-1){

        conversationThreads.push({

            title:
            userText.substring(0,25),

            messages:[]

        });


        activeThreadIndex =
        conversationThreads.length-1;

    }



    appendMessage(
        userText,
        "user"
    );


    conversationThreads[
        activeThreadIndex
    ]
    .messages.push({

        text:userText,
        sender:"user"

    });



    input.value="";



    const typing =
    appendMessage(
        "Thinking...",
        "ai"
    );



    try{


        const response =
        await fetch(
            API_URL,
            {

            method:"POST",

            headers:{
                "Content-Type":
                "application/json"
            },


            body:
            JSON.stringify({

                message:userText

            })

        });



        const data =
        await response.json();



        typing.remove();



        if(!response.ok){

            throw new Error(
                data.detail ||
                "Server error"
            );

        }



        appendMessage(
            data.reply,
            "ai"
        );



        conversationThreads[
            activeThreadIndex
        ]
        .messages.push({

            text:data.reply,

            sender:"ai"

        });



        saveThreads();



    }

    catch(error){


        typing.remove();


        appendMessage(

            "Connection error: "
            + error.message,

            "ai",

            true

        );


        console.error(error);

    }


    input.disabled=false;
    
    // input.focus(); // 🚨 এই লাইনটির জন্যই কীবোর্ড বারবার খুলে যাচ্ছিল, তাই এটি বন্ধ করে দেওয়া হলো!

}



// Enter button
document.addEventListener(
"DOMContentLoaded",
()=>{


    loadThreads();


    const input =
    document.getElementById("message");


    input.addEventListener(
    "keypress",
    (event)=>{

        if(event.key==="Enter"){

            event.preventDefault();

            sendMessage();
            input.blur(); // এন্টার চাপার সাথে সাথে কীবোর্ড নামিয়ে দেওয়ার জন্য এটি যোগ করা হলো

        }

    });



    const clear =
    document.getElementById(
        "clear-history"
    );


    if(clear){

        clear.onclick =
        clearHistory;

    }


});
