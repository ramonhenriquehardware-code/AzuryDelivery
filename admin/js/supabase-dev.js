(function () {
    "use strict";

    const SUPABASE_URL = "https://wsgmdgwzeequlcrgdjrx.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_I3lYVV7elsyYAfKWg2N1nw_T0a35TBo";

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        throw new Error("A biblioteca do Supabase não foi carregada.");
    }

    window.AzurySupabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

    window.AzurySupabaseConfig = Object.freeze({
        url: SUPABASE_URL,
        ambiente: "desenvolvimento"
    });
})();
