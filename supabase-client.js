import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://qcjszaznpxivbrmuhapa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hSFatKyaEPxTa1a7TPVtEg_FMOEFTFD';

window.db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
