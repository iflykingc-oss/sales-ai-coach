import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://doqcopkqbfpstuavfjsa.supabase.co';
const supabaseAnonKey = 'sb_publishable_Ds7ZgSp_CozB4O3xdiRC0w_OauuC-Sx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
