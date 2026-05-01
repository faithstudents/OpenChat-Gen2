import { createChatElement, getUserChats } from "./services/chats";
import { createMessageElement, getMessages, isGroupedWith, sendMessage, subscribeToMessages } from "./services/messages";
import { getAllUsers } from "./services/users";
import type { Message } from "./types/message";
import { logout } from "./utils/auth";
import { base_url, supabase } from "./utils/supabase";

/*
    CSS
*/
import './styles/master.css'
import './styles/header_footer.css'
import './styles/sidebar.css'
import './styles/messages.css'
import './styles/profile_tab.css'
import { setupProfileModal, setupProfileTab } from "./ui/profile_tab";

const messages_el = document.getElementById('__messages')!;
const chats_el = document.getElementById('__chats')!;
const input_el = document.getElementById('__message_input') as HTMLInputElement;
const send_btn_el = document.getElementById('__send_btn')!;
const scroll_btn = document.getElementById('__scroll_btn')!;

const logout_btn = document.getElementById('__logout_btn')!;

const welcome_msg = document.getElementById('__welcome_msg')!;

let currentChatId: string;
let currentSubscription: any = null;
let lastMessage: Message | null = null;
export let users: any;
let hasMoreMessages = true;
let isLoadingMore = false;

function isAtBottom(): boolean {
    const threshold = 50; // pixels from bottom, some wiggle room
    return messages_el.scrollHeight - messages_el.scrollTop - messages_el.clientHeight < threshold;
}

async function setup() {
    // Login and get the current users ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = `${base_url}/login.html`;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `${base_url}/login.html`; return; }

    // Get the last opened chat from local storage and fetch all the users
    const lastChatId = localStorage.getItem('oc_last_chat');
    users = await getAllUsers();
    const currentUser = await users.get(user.id);
    welcome_msg.innerHTML = `<h4>Welcome to OpenChat ${currentUser.display_name}!</h4>`

    // Setup the profile tab & modal
    setupProfileTab(users.get(user.id));
    setupProfileModal(users.get(user.id));

    if (lastChatId) {
        // Simulate clicking the chat and load all the messages
        currentChatId = lastChatId;
        const messages = await getMessages(lastChatId);
        lastMessage = null;

        messages.forEach((msg, index) => {
            const prev = messages[index - 1] ?? null;
            const grouped = isGroupedWith(msg, prev ?? undefined);

            const sender = users.get(msg.sender_id);
            const msg_el = createMessageElement(sender?.display_name ?? 'Unknown', msg.content ?? '', sender?.pfp_url ?? null, msg.created_at, grouped);
            msg_el.dataset.senderId = msg.sender_id;
            messages_el.appendChild(msg_el);
        });
        lastMessage = messages[messages.length - 1] ?? null;
        messages_el.scrollTop = messages_el.scrollHeight;

        currentSubscription = subscribeToMessages(lastChatId, async (msg) => {
            const atBottom = isAtBottom();
            const grouped = isGroupedWith(msg, lastMessage ?? undefined);

            const sender = await users.get(msg.sender_id);
            const msg_el = createMessageElement(sender.display_name ?? "Undefined", msg.content ?? '', sender.pfp_url ?? null, msg.created_at, grouped);
            msg_el.dataset.senderId = msg.sender_id;
            messages_el.appendChild(msg_el);
            lastMessage = msg;

            if (atBottom) {
                messages_el.scrollTop = messages_el.scrollHeight;
            } else {
                // Show the scroll to bottom button
                scroll_btn.style.display = 'flex';
            }
        });
    }

    let chats = await getUserChats(user.id);
    chats.forEach(chat => {
        const el = createChatElement(chat.name ?? 'Undefined', chat.icon);
        chats_el.appendChild(el);

        // Click listener
        el.addEventListener('click', async () => {
            // Clear the messages container so messages don't stack
            messages_el.innerHTML = '';
            lastMessage = null;
            currentChatId = chat.id;
            hasMoreMessages = true;

            // Save the currentChatId to local storage so we can pick up where we left off
            localStorage.setItem('oc_last_chat', chat.id);

            // Unsubscribe from previous chat
            if (currentSubscription) {
                currentSubscription.unsubscribe();
            }

            // Load a chat and its messages
            let messages = await getMessages(currentChatId);
                messages.forEach((msg, index) => {
                const prev = messages[index - 1] ?? null;
                const grouped = isGroupedWith(msg, prev ?? undefined);
                
                const sender = users.get(msg.sender_id);
                const msg_el = createMessageElement(sender?.display_name ?? 'Unknown', msg.content ?? '', sender?.pfp_url ?? null, msg.created_at, grouped);
                msg_el.dataset.senderId = msg.sender_id;
                messages_el.appendChild(msg_el);
            });
            lastMessage = messages[messages.length - 1] ?? null;
            messages_el.scrollTop = messages_el.scrollHeight;

            // Subscribe to new messages
            currentSubscription = subscribeToMessages(currentChatId, async (msg) => {
                const grouped = isGroupedWith(msg, lastMessage ?? undefined);

                const sender = await users.get(msg.sender_id);
                const msg_el = createMessageElement(sender.display_name ?? "Undefined", msg.content, sender.pfp_url ?? null, msg.created_at, grouped);
                msg_el.dataset.senderId = msg.sender_id;
                messages_el.appendChild(msg_el);
                lastMessage = msg;
            });
        });
    });

    // Send message logic
    send_btn_el.addEventListener('click', async () => {
        const content = input_el.value;

        if (currentChatId == null) {
            throw new Error('Error: Failed to send message! currentChatId is null.');
        }

        if (!content) return;               // Don't send an empty message or whitespace
        await sendMessage(currentChatId, user.id, content);
        input_el.value = '';
    });

    input_el.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            send_btn_el.click();
        }
    });

    // Scroll to bottom button. Scrolls to bottom and hides itself
    scroll_btn.addEventListener('click', () => {
        messages_el.scrollTop = messages_el.scrollHeight;
        scroll_btn.style.display = 'none';
    });

    messages_el.addEventListener('scroll', async () => {
        // Scroll to bottom button logic
        if (isAtBottom()) {
            scroll_btn.style.display = 'none';
        } else {
            scroll_btn.style.display = 'flex';
        }

        // Load more when near the top
        if (messages_el.scrollTop < 100 && !isLoadingMore) {
            isLoadingMore = true;
            await loadMoreMessages();
            isLoadingMore = false;
        }
    });

    // Logout button handling
    logout_btn.addEventListener('click', async () => {
        await logout();
    });
}



async function loadMoreMessages() {
    if (!hasMoreMessages) return;

    // Get timestamp of oldest rendered message
    const oldest = messages_el.querySelector('.message') as HTMLElement;
    const oldestTimestamp = oldest?.dataset.timestamp;
    if (!oldestTimestamp) return;

    const prevHeight = messages_el.scrollHeight;

    const more = await getMessages(currentChatId, oldestTimestamp);
    if (more.length === 0) {
        hasMoreMessages = false;  // Stop future fetches
        return;
    }

    // Prepend to top
    const elements: HTMLElement[] = [];
    lastMessage = null;
    more.reverse().forEach((msg, index) => {
        const prev = more[index - 1] ?? null;  // previous in the batch
        const grouped = isGroupedWith(msg, prev);
        const msg_el = createMessageElement(
            users.get(msg.sender_id)?.display_name ?? 'Unknown',
            msg.content,
            users.get(msg.sender_id)?.pfp_url ?? null,
            msg.created_at,
            grouped
        );

        msg_el.dataset.senderId = msg.sender_id;
        msg_el.dataset.timestamp = msg.created_at;

        elements.push(msg_el);
    });
    elements.forEach(el => messages_el.prepend(el));

    // Keep scroll position stable — don't jump to top
    messages_el.scrollTop = messages_el.scrollHeight - prevHeight;
}


// Run the app
await setup();
