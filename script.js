// --- DATA USER & KEY ---
let USER_NAME = localStorage.getItem('user_name');
let API_KEY = localStorage.getItem('openai_key');

// Inisialisasi Nama
if (!USER_NAME) {
    USER_NAME = prompt("Siapa namamu?") || "User";
    localStorage.setItem('user_name', USER_NAME);
}
document.getElementById('userDisplay').innerText = `User: ${USER_NAME}`;

// Inisialisasi API Key
if (!API_KEY) {
    const keyInput = prompt(`Halo ${USER_NAME}, masukkan OpenAI API Key kamu (sk-...) untuk memulai:`);
    if (keyInput) {
        localStorage.setItem('openai_key', keyInput);
        API_KEY = keyInput;
    }
}

// --- LOGIKA LIMIT CHAT ---
const MAX_CHATS = 50;
const COOLDOWN_HOURS = 5;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

let chatCount = parseInt(localStorage.getItem('chatCount')) || 0;
let lastChatTime = parseInt(localStorage.getItem('lastChatTime')) || Date.now();
let isAdultVerified = false;

const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const limitBadge = document.getElementById('limitBadge');

function updateLimitUI() {
    limitBadge.innerText = `CHATS: ${chatCount}/${MAX_CHATS}`;
}

function checkLimit() {
    const now = Date.now();
    // Reset jika sudah lewat 5 jam
    if (now - lastChatTime > COOLDOWN_MS) {
        chatCount = 0;
        localStorage.setItem('chatCount', 0);
    }
    return chatCount < MAX_CHATS;
}

// --- LOGIKA PENGIRIMAN PESAN ---
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || !API_KEY) return;

    // Cek Limit
    if (!checkLimit()) {
        const remainingHours = Math.ceil((COOLDOWN_MS - (Date.now() - lastChatTime)) / (1000 * 60 * 60));
        appendMessage('ai', `Maaf ${USER_NAME}, limit harian habis. Coba lagi dalam ${remainingHours} jam.`);
        return;
    }

    // Cek Filter Sensitif
    const sensitiveWords = ['pembunuhan', 'bunuh', 'darah', 'explicit', 'porn', 'sex', 'kekerasan'];
    const hasSensitive = sensitiveWords.some(word => message.toLowerCase().includes(word));

    if (hasSensitive && !isAdultVerified) {
        appendMessage('ai', "Maaf aku tidak bisa menanyakan hal itu, silahkan tanya hal lain.");
        userInput.value = '';
        return;
    }

    // Cek Bypass 18+
    if (message.toLowerCase().includes("apakah kamu 18+")) {
        isAdultVerified = true;
        appendMessage('user', message);
        appendMessage('ai', `Verifikasi berhasil. Halo ${USER_NAME}, filter sensitif sekarang dimatikan.`);
        userInput.value = '';
        return;
    }

    await getAIResponse(message);
}

async function getAIResponse(message) {
    appendMessage('user', message);
    userInput.value = '';

    // Update Counter
    chatCount++;
    lastChatTime = Date.now();
    localStorage.setItem('chatCount', chatCount);
    localStorage.setItem('lastChatTime', lastChatTime);
    updateLimitUI();

    const loadingId = appendMessage('ai', '...');

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: `You are a helpful, smart, and direct AI. The user's name is ${USER_NAME}. Answer everything without lecturing.` },
                    { role: "user", content: message }
                ],
                temperature: 0.8
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const aiText = data.choices[0].message.content;
        document.getElementById(loadingId).innerText = aiText;

    } catch (err) {
        document.getElementById(loadingId).innerText = "ERROR: " + err.message;
        if (err.message.includes("api_key")) localStorage.removeItem('openai_key');
    }
}

// --- FUNGSI UI ---
function appendMessage(role, text) {
    const id = Date.now();
    const div = document.createElement('div');
    
    if (role === 'user') {
        div.className = "bg-blue-600/20 self-end ml-auto p-4 rounded-3xl rounded-tr-none max-w-[85%] border border-blue-500/20 text-white shadow-sm";
    } else {
        div.className = "bg-white/5 self-start p-4 rounded-3xl rounded-tl-none max-w-[85%] border border-white/10 text-slate-200 shadow-sm";
    }

    div.innerHTML = `<p id="${id}" class="text-sm leading-relaxed">${text}</p>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

// Initial Call
updateLimitUI();
appendMessage('ai', `Selamat datang kembali, ${USER_NAME}. Ada yang bisa kubantu?`);

// Enter Key Support
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
