import { isAtBottom, scroll_btn } from "../../main";
import { store } from "../../store/store";
import { loadMoreMessages } from "../messages";

export async function on_scroll(messages_el: HTMLElement) {
    // Scroll to bottom button logic
    if (isAtBottom()) {
        scroll_btn.style.display = 'none';
    } else {
        scroll_btn.style.display = 'flex';
    }

    // Load more when near the top
    if (messages_el.scrollTop < 100 && !store.isLoadingMore) {
        store.isLoadingMore = true;
        await loadMoreMessages(messages_el);
        store.isLoadingMore = false;
    }
}

export async function scrollHandler(messages_el: HTMLElement) {
    messages_el.addEventListener('scroll', async () => {
        await scrollHandler(messages_el);
    });

    // Scroll to bottom button. Scrolls to bottom and hides itself
    scroll_btn.addEventListener('click', () => {
        messages_el.scrollTop = messages_el.scrollHeight;
        scroll_btn.style.display = 'none';
    });
}
