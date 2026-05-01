import type { User } from "../types/user";
import { supabase } from "../utils/supabase";

export async function getAllUsers(): Promise<Map<String, User>> {
    const { data, error } = await supabase
        .from('Users')
        .select('*')

    if (error) {
        throw new Error('Error: Failed to fetch users: ' + error.message);
    }

    const map = new Map<string, User>();
    (data as User[]).forEach(user => map.set(user.id, user));
    return map;
}