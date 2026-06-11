import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://doqcopkqbfpstuavfjsa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Ds7ZgSp_CozB4O3xdiRC0w_OauuC-Sx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
