import { supabase } from "../utils/supabase";
import type { Chat } from "../types/chat";

export async function getUserChats(userId: string) {
    // Fetch the chats the user is in
    const { data, error } = await supabase
        .from('Chat_Members')
        .select('Chats(*)')
        .eq('user_id', userId)

    if (error) {
        throw new Error("Error: Failed to fetch chats for user: '" + userId + "' | " + error.message);
    }

    // Use the chats data to fetch the actual chats from the 'Chats' table
    return (data?.map(row => row.Chats) as unknown as Chat[]) ?? []
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
