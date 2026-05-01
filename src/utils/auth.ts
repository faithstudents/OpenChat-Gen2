import { supabase } from "./supabase";

export async function login(username: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password
    });

    if (error) {
        throw new Error("Error: Failed to login!" + error.message);
    }
}

export async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        // We shouldn't hit this
        throw new Error("Error: Failed to sign out!" + error.message);
    }

    window.location.href = '/OpenChat-Gen2/login.html';
}
