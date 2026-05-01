/*
    chat.ts - The Chat type definition

    Every Chat inherits this type
*/
export type Chat = {
    id: string,
    created_at: string,
    name: string | null,
    type: "direct" | "group",
    icon: string | null,
};
