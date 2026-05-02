import { createChatElement, getUserChats } from "./services/chats";
// import { createMessageElement, getMessages, isGroupedWith, renderMessages, subscribeToMessages } from "./services/messages";
import { getAllUsers } from "./services/users";
import { logout } from "./utils/auth";
import { base_url, supabase } from "./utils/supabase";
import { store } from "./store/store";
import { setupProfileModal, setupProfileTab } from "./ui/profile_tab";

/*
    CSS
*/
import './styles/master.css'
import './styles/header_footer.css'
import './styles/sidebar.css'
import './styles/messages.css'
import './styles/profile_tab.css'
import { scrollHandler } from "./services/handlers/scrollHandler";
import { sendHandler } from "./services/handlers/sendHandler";
import { loadChat } from "./services/handlers/chatHandler";

/*
    Elements
*/
export const messages_el = document.getElementById('__messages')!;
export const chats_el = document.getElementById('__chats')!;
export const input_el = document.getElementById('__message_input') as HTMLInputElement;
export const send_btn_el = document.getElementById('__send_btn')!;
export const scroll_btn = document.getElementById('__scroll_btn')!;
const logout_btn = document.getElementById('__logout_btn')!;
const welcome_msg = document.getElementById('__welcome_msg')!;

export function isAtBottom(): boolean {
    const threshold = 50; // pixels from bottom, some wiggle room
    return messages_el.scrollHeight - messages_el.scrollTop - messages_el.clientHeight < threshold;
}

async function setup() {
    console.log('setup called');

    // Login and get the current users ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = `${base_url}/login.html`;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `${base_url}/login.html`; return; }

    // Get the last opened chat from local storage and fetch all the users
    const lastChatId = localStorage.getItem('oc_last_chat');
    store.users = await getAllUsers();
    const currentUser = await store.users.get(user.id);
    welcome_msg.innerHTML = `<h4>Welcome to OpenChat ${currentUser.display_name}!</h4>`

    // Setup the profile tab & modal
    setupProfileTab(store.users.get(user.id));
    setupProfileModal(store.users.get(user.id));

    if (lastChatId) {
        loadChat(lastChatId);
    }

    let chats = await getUserChats(user.id);
    chats.forEach(chat => {
        const el = createChatElement(chat.name ?? 'Undefined', chat.icon);
        chats_el.appendChild(el);

        // Click listener
        el.addEventListener('click', async () => loadChat(chat.id));
    });

    // Run the scroll handler & send message handler
    await scrollHandler(messages_el);
    await sendHandler(user);

    // Logout button handling
    logout_btn.addEventListener('click', async () => {
        await logout();
    });
}


// Run the app
await setup();
