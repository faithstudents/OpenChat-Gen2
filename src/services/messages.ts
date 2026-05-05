import { supabase } from "../utils/supabase";
import type { Message } from "../types/message";
import { store } from "../store/store";
import { linkify } from "../utils/linkify";

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

export async function getMessage(id: string) {
    const { data, error } = await supabase
        .from('Messages')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        throw new Error("Failed to get message! Does it exist? | => " + error.message);
    }

    return data as Message;
}

export async function sendMessage(chatId: string, senderId: string, content: string, replyTo: string | null = null) {
    const { error } = await supabase
        .from('Messages')
        .insert({
            sender_id: senderId,
            chat_id: chatId,
            content: content,
            reply_to: replyTo
        })

    if (error) {
        throw new Error('Error: Failed to send message! | ' + error.message);
    }
}

export async function renderMessages(messages: Message[], messages_el: HTMLElement) {
    messages.forEach((msg, index) => {
        store.messageCache.set(msg.id, msg);
        const prev = messages[index - 1] ?? null;
        const grouped = isGroupedWith(msg, prev ?? undefined);
    
        const sender = store.users.get(msg.sender_id);
        const msg_el = createMessageElement(sender?.display_name ?? 'Unknown', msg.content ?? '', sender?.pfp_url ?? null, msg.created_at, grouped, msg);
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
        store.messageCache.set(msg.id, msg);
        const prev = more[index - 1] ?? null;  // previous in the batch
        const grouped = isGroupedWith(msg, prev);
        const msg_el = createMessageElement(
            store.users.get(msg.sender_id)?.display_name ?? 'Unknown',
            msg.content,
            store.users.get(msg.sender_id)?.pfp_url ?? null,
            msg.created_at,
            grouped,
            msg
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

async function handleReply(msg: Message) {
    store.replyingTo = msg.id;
    
    // Show the preview bar above the input
    const input_bar = document.getElementById('__input_bar')!;
    
    // Remove any existing preview first
    const existing = document.getElementById('__reply_bar');
    if (existing) existing.remove();
    
    const reply_bar = createReplyPreview(msg.id);
    reply_bar.id = '__reply_bar';
    
    // Add cancel button
    const cancel = document.createElement('button');
    cancel.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    cancel.onclick = () => {
        store.replyingTo = null;
        reply_bar.remove();
    };
    reply_bar.appendChild(cancel);
    
    input_bar.insertAdjacentElement('beforebegin', reply_bar);
}

export function createMessageControls(message: Message) {
    const el = document.createElement('div');
    el.classList.add('message_controls');

    const actions = [
        { icon: '<i class="fa-solid fa-reply"></i>', label: 'Reply', action: () => handleReply(message) },
        // { icon: 'ED', label: 'Edit', action: () => handleEdit(message) },
        // { icon: 'DE', label: 'Delete', action: () => handleDelete(message) }
    ];

    actions.forEach(item => {
        const btn = document.createElement('button');
        btn.classList.add('control_btn');
        btn.innerHTML = item.icon;
        btn.title = item.label;
        btn.onclick = (e) => {
            e.stopPropagation(); // Don't trigger message click
            item.action();
            console.log("Reply to: ", message.id);
        };
        el.appendChild(btn);
    });

    return el;
}

export function createReplyPreview(id: string) {
    const el = document.createElement('div');
    el.classList.add('reply_preview');

    const content = document.createElement('p');
    content.classList.add('reply_preview_content');

    const msg = store.messageCache.get(id);
    content.innerText = msg?.content ?? "Message not found.";

    el.appendChild(content);
    return el;
}

export function isGroupedWith(current: Message, previous: Message | undefined): boolean {
    if (!previous) return false;
    if (current.sender_id !== previous.sender_id) return false;

    const curr_time = new Date(current.created_at).getTime();
    const prev_time = new Date(previous.created_at).getTime();
    const diff_minutes = (curr_time - prev_time) / 1000 / 60;

    return diff_minutes <= 1;
}

export function createMessageElement(send_name: string, content: string | null, pfp: string | null, timestamp: string, isGrouped: boolean = false, msg: Message) {
    const el = document.createElement('li');
    el.classList.add('message');
    if (isGrouped) el.classList.add('grouped');
    el.dataset.timestamp = timestamp;

    // The Hover Toolbar (The "Thingy")
    const controls = createMessageControls(msg);
    el.appendChild(controls);

    // Left Pillar (PFP or empty space for alignment)
    const pfp_container = document.createElement('div');
    pfp_container.classList.add('pfp_container');

    if (!isGrouped) {
        const pfp_el = document.createElement('img');
        pfp_el.classList.add('pfp');
        pfp_el.src = pfp ?? 'images/typescript.svg';
        pfp_container.appendChild(pfp_el);
    }

    // Right Pillar (Content)
    const message_body = document.createElement('div');
    message_body.classList.add('message_body');

    if (!isGrouped) {
        const user_details = document.createElement('div');
        user_details.classList.add('user_details');

        const name_el = document.createElement('h4');
        name_el.classList.add('username');
        name_el.innerText = send_name;

        const timestamp_el = document.createElement('p');
        timestamp_el.classList.add('timestamp');
        timestamp_el.innerText = formatTimestamp(timestamp);

        user_details.appendChild(name_el);
        user_details.appendChild(timestamp_el);
        message_body.appendChild(user_details);
    }

    if (msg.reply_to) {
        const reply_msg = store.messageCache.get(msg.reply_to);
        
        const preview = document.createElement('div');
        preview.classList.add('reply_preview');
        
        const preview_t = document.createElement('p');
        preview_t.innerText = reply_msg?.content ?? 'Message not found';
        preview.appendChild(preview_t);
        
        message_body.appendChild(preview);
    }

    const content_el = document.createElement('p');
    content_el.classList.add('content');
    content_el.innerHTML = linkify(content ?? "Undefined");
    message_body.appendChild(content_el);

    el.appendChild(pfp_container);
    el.appendChild(message_body);
    
    return el;
}
