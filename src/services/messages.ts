import { supabase } from "../utils/supabase";
import type { Message } from "../types/message";
import { store } from "../store/store";

export async function getMessages(chatId: string, before?: string): Promise<Message[]> {
    let query = supabase
        .from('Messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })  // newest first
        .limit(50)

    if (before) {
        query = query.lt('created_at', before)  // older than this timestamp
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to load messages: ${error.message}`)

    return (data as Message[]).reverse()  // flip back to oldest first for rendering
}

export async function sendMessage(chatId: string, senderId: string, content: string) {
    const { error } = await supabase
        .from('Messages')
        .insert({
            sender_id: senderId,
            chat_id: chatId,
            content: content
        })

    if (error) {
        throw new Error('Error: Failed to send message! | ' + error.message);
    }
}

export async function renderMessages(messages: Message[], messages_el: HTMLElement) {
    messages.forEach((msg, index) => {
        const prev = messages[index - 1] ?? null;
        const grouped = isGroupedWith(msg, prev ?? undefined);
    
        const sender = store.users.get(msg.sender_id);
        const msg_el = createMessageElement(sender?.display_name ?? 'Unknown', msg.content ?? '', sender?.pfp_url ?? null, msg.created_at, grouped);
        msg_el.dataset.senderId = msg.sender_id;
        messages_el.appendChild(msg_el);
    });
    store.lastMessage = messages[messages.length - 1] ?? null;
    messages_el.scrollTop = messages_el.scrollHeight;
}

export function subscribeToMessages(chatId: string, onMessage: (msg: Message) => void) {
    // Subscribe to a specific chats realtime channel
    const channel = supabase
        .channel(`Messages:${chatId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'Messages',
            filter: `chat_id=eq.${chatId}`
        }, (payload) => {
            onMessage(payload.new as Message)
        })
        .subscribe()

    // Return it so we can unsubscribe later
    return channel;
}

export async function loadMoreMessages(messages_el: HTMLElement) {
    if (!store.hasMoreMessages) return;

    // Get timestamp of oldest rendered message
    const oldest = messages_el.querySelector('.message') as HTMLElement;
    const oldestTimestamp = oldest?.dataset.timestamp;
    if (!oldestTimestamp) return;

    const prevHeight = messages_el.scrollHeight;

    const more = await getMessages(store.currentChatId, oldestTimestamp);
    if (more.length === 0) {
        store.hasMoreMessages = false;  // Stop future fetches
        return;
    }

    // Prepend to top
    const elements: HTMLElement[] = [];
    store.lastMessage = null;
    more.reverse().forEach((msg, index) => {
        const prev = more[index - 1] ?? null;  // previous in the batch
        const grouped = isGroupedWith(msg, prev);
        const msg_el = createMessageElement(
            store.users.get(msg.sender_id)?.display_name ?? 'Unknown',
            msg.content,
            store.users.get(msg.sender_id)?.pfp_url ?? null,
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

function formatTimestamp(created_at: string): string {
    const date = new Date(created_at)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
        return date.toLocaleTimeString('en-AU', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) // "5:50 pm"
    }

    return date.toLocaleString('en-AU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }) // "30/04/26, 5:50 pm"
}

export function isGroupedWith(current: Message, previous: Message | undefined): boolean {
    if (!previous) return false;
    if (current.sender_id !== previous.sender_id) return false;

    const curr_time = new Date(current.created_at).getTime();
    const prev_time = new Date(previous.created_at).getTime();
    const diff_minutes = (curr_time - prev_time) / 1000 / 60;

    return diff_minutes <= 1;
}

export function createMessageElement(send_name: string, content: string | null, pfp: string | null, timestamp: string, isGrouped: boolean = false) {
    const el = document.createElement('li');
    el.classList.add('message');
    el.dataset.timestamp = timestamp;

    const message_content = document.createElement('div');

    const name_el = document.createElement('h4');
    const content_el = document.createElement('p');
    const timestamp_el = document.createElement('p');
    const pfp_el = document.createElement('img');

    name_el.classList.add('username');
    content_el.classList.add('content');
    timestamp_el.classList.add('timestamp');
    pfp_el.classList.add('pfp');

    const user_el = document.createElement('div');

    if (!isGrouped) {
        // Format the timestamp
        const date = formatTimestamp(timestamp);
        pfp_el.src = pfp ?? 'images/typescript.svg';
        user_el.classList.add('user_details');

        name_el.innerText = send_name;
        content_el.innerText = content ?? '';
        timestamp_el.innerText = date;

        user_el.appendChild(name_el);
        user_el.appendChild(timestamp_el);
        el.appendChild(pfp_el);
    } else {
        // Just append the message content with some padding
        content_el.innerText = content ?? '';
        content_el.style.paddingLeft = '50px';
    }

    message_content.appendChild(user_el);
    message_content.appendChild(content_el);

    el.appendChild(message_content);
    return el;
}
