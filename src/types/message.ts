/*
    message.ts - The Message type definition

    Every Message inherits this type
*/
export type Message = {
    id: string,
    created_at: string,
    sender_id: string,                  // FK -> users.id
    chat_id: string | null,             // FK -> chats.id, null if DM
    content: string | null,
    reply_to: string | null,            // FK -> messages.id, null if not a reply
};
