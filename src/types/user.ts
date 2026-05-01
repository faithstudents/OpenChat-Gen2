/*
    user.ts - The User type definition

    Every User inherits this type
*/
export type User = {
    id: string,
    created_at: string,
    display_name: string | null,
    pfp_url: string | null
};
