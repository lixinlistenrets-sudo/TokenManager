// TokenManager.js
// Plugin Name: Token Manager
// Version: 2.0
// Author: wumuw
// Description: Manage alt accounts, copy tokens, switch accounts instantly

const config = {
    name: "TokenManager",
    version: "2.0.0",
    author: "wumuw",
    description: "Manage alt accounts and copy tokens"
};

let alts = [];
let currentAlt = null;

function loadAlts() {
    try {
        const saved = localStorage.getItem("revenge_alts");
        if (saved) alts = JSON.parse(saved);
        console.log(`[TokenManager] Loaded ${alts.length} alts`);
    } catch(e) {}
}

function saveAlts() {
    localStorage.setItem("revenge_alts", JSON.stringify(alts));
}

function showToast(msg, type) {
    const toast = document.createElement("div");
    toast.textContent = msg;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === "error" ? "#da373c" : "#23a55a"};
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        z-index: 99999;
        font-size: 14px;
        animation: fadeOut 2s forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function sendToChat(content) {
    const input = document.querySelector("[contenteditable='true']");
    if (input) {
        input.textContent = content;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        setTimeout(() => {
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        }, 100);
    }
}

async function fetchUserInfo(token, index) {
    try {
        const res = await fetch("https://discord.com/api/v9/users/@me", {
            headers: { Authorization: token }
        });
        if (res.ok) {
            const user = await res.json();
            alts[index].username = user.username;
            alts[index].userId = user.id;
            saveAlts();
        }
    } catch(e) {}
}

function addAlt(args) {
    const token = args[0];
    const name = args.slice(1).join(" ") || `Alt #${alts.length + 1}`;
    
    if (!token) {
        showToast("Usage: .altadd <token> [name]", "error");
        return;
    }
    
    if (alts.some(a => a.token === token)) {
        showToast("Token already exists", "error");
        return;
    }
    
    alts.push({ token, name, added: Date.now() });
    saveAlts();
    showToast(`Added ${name}`, "success");
    fetchUserInfo(token, alts.length - 1);
}

function listAlts() {
    if (alts.length === 0) {
        showToast("No alt accounts. Use .altadd <token>", "error");
        return;
    }
    
    let msg = `**Alt Accounts (${alts.length})**\n\n`;
    alts.forEach((alt, i) => {
        const display = alt.username || alt.name;
        const active = currentAlt === alt.token ? " ✅ ACTIVE" : "";
        msg += `${i + 1}. ${display}${active}\n   \`${alt.token.substring(0, 25)}...\`\n\n`;
    });
    sendToChat(msg);
}

function switchAlt(args) {
    const identifier = args[0];
    if (!identifier) {
        showToast("Usage: .altswitch <number or name>", "error");
        return;
    }
    
    let alt = null;
    const num = parseInt(identifier) - 1;
    if (!isNaN(num) && alts[num]) {
        alt = alts[num];
    } else {
        alt = alts.find(a => 
            a.name.toLowerCase().includes(identifier.toLowerCase()) ||
            (a.username && a.username.toLowerCase().includes(identifier.toLowerCase()))
        );
    }
    
    if (!alt) {
        showToast("Alt not found", "error");
        return;
    }
    
    currentAlt = alt.token;
    saveAlts();
    localStorage.setItem("revenge_token", alt.token);
    showToast(`Switched to ${alt.username || alt.name}`, "success");
    
    setTimeout(() => {
        if (confirm("Reload to apply new token?")) {
            window.location.reload();
        }
    }, 500);
}

async function copyAlt(args) {
    const identifier = args[0];
    if (!identifier) {
        showToast("Usage: .altcopy <number or name>", "error");
        return;
    }
    
    let alt = null;
    const num = parseInt(identifier) - 1;
    if (!isNaN(num) && alts[num]) {
        alt = alts[num];
    } else {
        alt = alts.find(a => 
            a.name.toLowerCase().includes(identifier.toLowerCase()) ||
            (a.username && a.username.toLowerCase().includes(identifier.toLowerCase()))
        );
    }
    
    if (!alt) {
        showToast("Alt not found", "error");
        return;
    }
    
    await navigator.clipboard.writeText(alt.token);
    showToast(`Copied ${alt.username || alt.name}'s token`, "success");
}

function removeAlt(args) {
    const identifier = args[0];
    if (!identifier) {
        showToast("Usage: .altremove <number or name>", "error");
        return;
    }
    
    let index = -1;
    const num = parseInt(identifier) - 1;
    if (!isNaN(num) && alts[num]) {
        index = num;
    } else {
        index = alts.findIndex(a => 
            a.name.toLowerCase().includes(identifier.toLowerCase()) ||
            (a.username && a.username.toLowerCase().includes(identifier.toLowerCase()))
        );
    }
    
    if (index === -1) {
        showToast("Alt not found", "error");
        return;
    }
    
    const removed = alts.splice(index, 1)[0];
    saveAlts();
    showToast(`Removed ${removed.username || removed.name}`, "success");
}

function clearAlts() {
    if (alts.length === 0) {
        showToast("No alts to clear", "error");
        return;
    }
    
    const count = alts.length;
    alts = [];
    currentAlt = null;
    saveAlts();
    showToast(`Cleared ${count} alt accounts`, "success");
}

function handleCommand(msg) {
    if (!msg.content || !msg.content.startsWith(".")) return;
    
    const args = msg.content.slice(1).split(" ");
    const cmd = args[0].toLowerCase();
    
    switch(cmd) {
        case "altadd":
            addAlt(args.slice(1));
            break;
        case "altlist":
            listAlts();
            break;
        case "altswitch":
            switchAlt(args.slice(1));
            break;
        case "altcopy":
            copyAlt(args.slice(1));
            break;
        case "altremove":
            removeAlt(args.slice(1));
            break;
        case "altclear":
            clearAlts();
            break;
        default:
            break;
    }
}

function addSwitcherButton() {
    const btn = document.createElement("div");
    btn.id = "alt-switcher";
    btn.innerHTML = "🎫";
    btn.title = "Switch Alt";
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 40px;
        height: 40px;
        background: #5865f2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 9999;
        font-size: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    btn.onclick = showSwitcherMenu;
    document.body.appendChild(btn);
}

function showSwitcherMenu() {
    let menu = document.getElementById("alt-switcher-menu");
    if (menu) {
        menu.remove();
        return;
    }
    
    menu = document.createElement("div");
    menu.id = "alt-switcher-menu";
    menu.style.cssText = `
        position: fixed;
        bottom: 70px;
        left: 20px;
        background: #1e1f22;
        border-radius: 12px;
        padding: 8px;
        min-width: 180px;
        z-index: 10000;
        border: 1px solid #2b2d31;
    `;
    
    if (alts.length === 0) {
        menu.innerHTML = `<div style="padding: 12px; color: #949ba4;">No alts</div>`;
    } else {
        alts.forEach((alt, i) => {
            const item = document.createElement("div");
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-radius: 8px;
                color: #dbdee1;
            `;
            item.textContent = alt.username || alt.name;
            item.onmouseenter = () => item.style.background = "#2b2d31";
            item.onmouseleave = () => item.style.background = "transparent";
            item.onclick = () => {
                switchAlt([String(i + 1)]);
                menu.remove();
            };
            menu.appendChild(item);
        });
    }
    
    document.body.appendChild(menu);
    
    setTimeout(() => {
        document.addEventListener("click", function close(e) {
            if (!menu.contains(e.target) && e.target !== document.getElementById("alt-switcher")) {
                menu.remove();
                document.removeEventListener("click", close);
            }
        });
    }, 100);
}

// Plugin entry points
function start() {
    loadAlts();
    addSwitcherButton();
    
    // Listen for messages
    window.addEventListener("revenge_message", (e) => handleCommand(e.detail));
    
    console.log("[TokenManager] Started");
}

function stop() {
    document.getElementById("alt-switcher")?.remove();
    document.getElementById("alt-switcher-menu")?.remove();
    console.log("[TokenManager] Stopped");
}

// Export for Revenge
if (typeof module !== "undefined" && module.exports) {
    module.exports = { config, start, stop };
}
