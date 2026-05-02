import { isAtBottom, messages_el, scroll_btn } from "../../main";
import { store } from "../../store/store";
import { createMessageElement, getMessages, isGroupedWith, renderMessages, subscribeToMessages } from "../messages";

export function loadChat(chatId: string) {
    messages_el.innerHTML = '';
    store.lastMessage = null;
    store.hasMoreMessages = true;
    localStorage.setItem('oc_last_chat', chatId);
    store.currentChatId = chatId;

    if (store.currentSubscription) {
        store.currentSubscription.unsubscribe();
    }

    getMessages(chatId).then(messages => {
        renderMessages(messages, messages_el);
        store.lastMessage = messages[messages.length - 1] ?? null;
        messages_el.scrollTop = messages_el.scrollHeight;
    });

    store.currentSubscription = subscribeToMessages(chatId, async (msg) => {
        const atBottom = isAtBottom();
        const grouped = isGroupedWith(msg, store.lastMessage ?? undefined);
        const sender = store.users.get(msg.sender_id);
        const msg_el = createMessageElement(sender?.display_name ?? 'Unknown', msg.content ?? '', sender?.pfp_url ?? null, msg.created_at, grouped);
        messages_el.appendChild(msg_el);
        store.lastMessage = msg;

        if (atBottom) messages_el.scrollTop = messages_el.scrollHeight;
        else scroll_btn.style.display = 'flex';
    });
}
