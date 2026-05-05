import { store } from "../store/store";
import { supabase } from "../utils/supabase";

const chat_name_input = document.getElementById('__create_chat_name') as HTMLInputElement;
const chat_type_select = document.getElementById('__create_chat_type') as HTMLSelectElement;

export async function createChat(name: string, type: string, icon: string | null) {
    const { data, error } = await supabase
        .from('Chats')
        .insert({
            name: name,
            type: type,
            icon: icon
        })
        .select()
        .single()

    if (error) {
        throw new Error('Error: Failed to send message! | ' + error.message);
    }

    return data.id;
}

export async function onChatButtonPressed() {
    if (!chat_name_input.value) return;
    const chat_name = chat_name_input.value;
    const chat_type = chat_type_select.value;

    const newChatId = await createChat(chat_name, chat_type, null);

    // After creating the chat, add creator as member
    const { error: memberError } = await supabase
        .from('Chat_Members')
        .insert({
            chat_id: newChatId,
            user_id: store.currentUser
        })

    if (memberError) throw new Error(`Failed to add creator to chat: ${memberError.message}`)
}
