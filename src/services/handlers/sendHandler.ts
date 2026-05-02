import { send_btn_el, input_el } from "../../main";
import { store } from "../../store/store";
import { sendMessage } from "../messages";


export async function sendHandler(user: any) {
    // Send message logic
    send_btn_el.addEventListener('click', async () => {
        const content = input_el.value;

        if (store.currentChatId == null) {
            throw new Error('Error: Failed to send message! currentChatId is null.');
        }

        if (!content) return;               // Don't send an empty message or whitespace
        await sendMessage(store.currentChatId, user.id, content);
        input_el.value = '';
    });

    input_el.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            send_btn_el.click();
        }
    });
}