import type { Message } from "../types/message";


export const store = {
    currentChatId: '' as string,
    lastMessage: null as any,
    currentSubscription: null as any,
    hasMoreMessages: true,
    isLoadingMore: false,
    users: null as any,
    replyingTo: null as string | null,
    currentUser: null as any,
    messageCache: new Map<string, Message>(),
};
