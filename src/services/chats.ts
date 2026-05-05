import { supabase } from "../utils/supabase";
import type { Chat } from "../types/chat";

export async function getUserChats(userId: string) {
    // Fetch the chats the user is in
    const { data, error } = await supabase
        .from('Chat_Members')
        .select('Chats(*)')
        .eq('user_id', userId)
        .eq('Chats.type', 'group')

    if (error) {
        throw new Error("Error: Failed to fetch chats for user: '" + userId + "' | " + error.message);
    }

    // Use the chats data to fetch the actual chats from the 'Chats' table
    return (data?.map(row => row.Chats) as unknown as Chat[])
        .filter(chat => chat != null) ?? []
}

export async function getUserDMs(userId: string) {
    // Fetch the chats the user is in
    const { data, error } = await supabase
        .from('Chat_Members')
        .select('Chats(*)')
        .eq('user_id', userId)
        .eq('Chats.type', 'direct')

    if (error) {
        throw new Error("Error: Failed to fetch chats for user: '" + userId + "' | " + error.message);
    }

    // Use the chats data to fetch the actual chats from the 'Chats' table
    return (data?.map(row => row.Chats) as unknown as Chat[])
        .filter(chat => chat != null) ?? []
}

export function createChatElement(name: string, icon: string | null) {
    const el = document.createElement('button');
    el.dataset.tooltip = name;

    const icon_el = document.createElement('img');
    icon_el.style.width = icon_el.style.height = '45px';
    icon_el.style.borderRadius = '8px';
    icon_el.src = (icon == null || icon == 'NULL') ? 'images/typescript.svg' : icon;

    el.appendChild(icon_el);
    return el;
}

export function createDMChatElement(name: string, icon: string | null) {
    const el = document.createElement('button');
    el.dataset.tooltip = name;
    el.classList.add('dm');

    const icon_el = document.createElement('img');
    icon_el.src = (icon == null || icon == 'NULL') ? 'images/typescript.svg' : icon;
    icon_el.classList.add('dm_icon');

    const chat_name = document.createElement('h4');
    chat_name.innerText = name;
    chat_name.classList.add('dm_name');

    const right = document.createElement('div');
    right.classList.add('dm_right');
    el.style.display = 'flex';
    right.appendChild(chat_name);

    el.appendChild(icon_el);
    el.appendChild(right);
    return el;
}
