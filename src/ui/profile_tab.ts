import type { User } from "../types/user";
import { base_url } from "../utils/supabase";

const pfp = document.getElementById('__profile_tab_pfp') as HTMLImageElement;
const display_name = document.getElementById('__profile_tab_display_name');
const status = document.getElementById('__profile_tab_status');

const profile_modal_btn = document.getElementById('profile_data');
const profile_modal = document.getElementById('profile_modal');

const m_pfp = document.getElementById('__profile_modal_pfp') as HTMLImageElement;
const m_display_name = document.getElementById('__profile_modal_display_name');
const m_status = document.getElementById('__profile_modal_status');

export function setupProfileTab(user: User) {
    pfp.src = user.pfp_url ?? `${base_url}/images/typescript.svg`;
    display_name.innerText = user.display_name;

    // We'll set this one when we have a slot in the Users table for status
    status.innerText = 'Online';
}

export function setupProfileModal(user: User) {
    // The box that appears when the profile tab is clicked
    profile_modal_btn.addEventListener('click', () => {
        // Open the profile modal
        profile_modal.style.display = 'flex';
    });

    // So we can close it
    document.addEventListener('click', (e) => {
        if (!profile_modal.contains(e.target as Node) && !profile_modal_btn.contains(e.target as Node)) {
            profile_modal.style.display = 'none';
        }
    });

    // Load the username, PFP, and status
    m_pfp.src = user.pfp_url ?? `${base_url}/images/typescript.svg`;
    m_display_name.innerText = user.display_name;

    // We'll set this one when we have a slot in the Users table for status
    m_status.innerText = 'Online';
}
