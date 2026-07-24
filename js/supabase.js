const SUPABASE_URL =
    "https://wsgmdgwzeequlcrgdjrx.supabase.co";

const SUPABASE_CHAVE_PUBLICA =
    "sb_publishable_I3lYVV7elsyYAfKWg2N1nw_T0a35TBo";


window.azurySupabase =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_CHAVE_PUBLICA,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );