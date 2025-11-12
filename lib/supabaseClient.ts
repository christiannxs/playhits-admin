
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// INSTRUÇÕES:
// 1. Crie um novo projeto no Supabase.
// 2. Vá para "Project Settings" > "API".
// 3. Copie a "Project URL" e cole na variável supabaseUrl abaixo.
// 4. Copie a chave "anon" "public" e cole na variável supabaseAnonKey abaixo.

const supabaseUrl = 'https://kkoeclshogsufckkpqjj.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtrb2VjbHNob2dzdWZja2twcWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzUzOTYsImV4cCI6MjA3ODU1MTM5Nn0.YG4ZfJANfqxA53mHyNxkYFze90ySc3afEtcEg11a8ms';

let supabase: SupabaseClient | null = null;
let configurationError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('COLE_A_SUA_URL') || supabaseAnonKey.includes('COLE_A_SUA_CHAVE')) {
  configurationError = 'As credenciais do Supabase não foram configuradas. Verifique o arquivo lib/supabaseClient.ts';
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase, configurationError };