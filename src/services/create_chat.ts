import { store } from "../store/store";
import { supabase } from "../utils/supabase";

const chat_name_input = document.getElementById('__create_chat_name') as HTMLInputElement;
const chat_type_select = document.getElementById('__create_chat_type') as HTMLSelectElement;
const chat_members_select = document.getElementById('__create_chat_members')!;
const active_members = document.getElementById('__create_chat_active_members')!;

async function createChat(name: string, type: string, icon: string | null) {
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

function createMemberElement(name: string, pfp: string, userId: string) {
    const el = document.createElement('button');
    const name_el = document.createElement('h4');
    const pfp_el = document.createElement('img');

    el.classList.add('create_member');
    name_el.classList.add('create_member_name');
    pfp_el.classList.add('create_chat_pfp');

    pfp_el.src = pfp;
    name_el.innerText = name;
    el.dataset.userId = userId;

    el.appendChild(pfp_el);
    el.appendChild(name_el);

    return el;
}

async function addMemberToChat(id: string, chatId: string) {
    const { error } = await supabase
        .from('Chat_Members')
        .insert({
            user_id: id,
            chat_id: chatId
        })
        .select()
        .single()

    if (error) {
        throw new Error('Error: Failed to add user to chat! | ' + error.message);
    }
}

// Called when modal opens - just renders the member picker
export async function populateMemberList() {
    chat_members_select.innerHTML = '';
    active_members.innerHTML = '';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // user is null → bail safely

    const currentUserId = user.id;

    store.users.forEach((userObj: { display_name: any; pfp_url: any; }, id: string) => {
        if (id === currentUserId) return; // skip creator

        const el = createMemberElement(
            userObj.display_name ?? 'Unknown',
            userObj.pfp_url ?? 'images/typescript.svg',
            id
        );

        moveToAvailable(el);
    });
}

function moveToActive(el: HTMLElement) {
    active_members.appendChild(el);
    el.onclick = () => moveToAvailable(el);
}

function moveToAvailable(el: HTMLElement) {
    chat_members_select.appendChild(el);
    el.onclick = () => moveToActive(el);
}

// Called when "Create" button is pressed
export async function onCreateConfirmed(userId: string) {
    if (!chat_name_input.value) return;
    
    const newChatId = await createChat(chat_name_input.value, chat_type_select.value, null);
    
    // Add creator automatically
    await addMemberToChat(userId, newChatId);
    console.log("Creating chat...");
    
    // Add selected members
    active_members.querySelectorAll('.create_member').forEach(async (el) => {
        await addMemberToChat((el as HTMLElement).dataset.userId!, newChatId);
    });
}
