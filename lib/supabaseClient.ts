
import { createClient } from '@supabase/supabase-js';

// TODO: Substitua os valores abaixo com a URL e a Chave Anônima do seu projeto Supabase.
// Você pode encontrá-las em: Seu Projeto > Configurações (ícone de engrenagem) > API.

// Exemplo de como a URL se parece: https://abcdefghijklmnop.supabase.co
const supabaseUrl = 'https://lmuupucfhdvmaujthcxb.supabase.co'; 

// Exemplo de como a Chave se parece: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtdXVwdWNmaGR2bWF1anRoY3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgxNDksImV4cCI6MjA3ODM3NDE0OX0.ucrCrtlFOd0zpbJQeNuaai8mwjXG78CrNpVB3Cl3HJk';

export const isSupabaseConfigured = 
  supabaseUrl !== 'https://lmuupucfhdvmaujthcxb.supabase.co' && 
  supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtdXVwdWNmaGR2bWF1anRoY3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTgxNDksImV4cCI6MjA3ODM3NDE0OX0.ucrCrtlFOd0zpbJQeNuaai8mwjXG78CrNpVB3Cl3HJk';


if (!isSupabaseConfigured) {
    console.warn("As credenciais do Supabase não foram definidas. Por favor, atualize o arquivo lib/supabaseClient.ts com a URL e a Chave Anônima do seu projeto.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
