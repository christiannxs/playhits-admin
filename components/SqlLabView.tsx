
import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../lib/supabaseClient';

const SqlLabView: React.FC = () => {
  const [naturalQuery, setNaturalQuery] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const ai = useMemo(() => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'COLE_A_SUA_CHAVE_AQUI') {
      console.error("Gemini API key not found. Please set the API_KEY environment variable.");
      return null;
    }
    try {
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Error initializing GoogleGenAI:", e);
      setError(`Falha ao inicializar a API do Gemini. Verifique o console para mais detalhes.`);
      return null;
    }
  }, []);

  const dbSchema = `
    - Tabela: designers (id, auth_user_id, name, username, type, role, salary)
    - Tabela: tasks (id, description, designer_id, media_type, due_date, created_at, value, artist, social_media)
    - Tabela: artists (id, name)
    - Tabela: advances (id, designer_id, amount, date, description)
  `;

  const handleGenerateSql = async () => {
    if (!naturalQuery || !ai) {
        setError('Por favor, insira uma pergunta e certifique-se que a API Key está configurada.');
        return;
    }
    setIsLoading(true);
    setError('');
    setSqlQuery('');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Com base no seguinte esquema de banco de dados PostgreSQL, traduza a pergunta do usuário em uma consulta SQL.
            Responda apenas com o código SQL. Não inclua \`\`\`sql ou qualquer outra formatação. A consulta deve ser somente leitura (SELECT).

            Esquema:
            ${dbSchema}

            Pergunta do usuário: "${naturalQuery}"
            `
        });
        
        const generatedSql = response.text.trim();

        if (generatedSql.toLowerCase().startsWith('select')) {
            setSqlQuery(generatedSql);
        } else {
            setError('A consulta gerada não é uma consulta SELECT válida. Por favor, tente reformular sua pergunta.');
        }

    } catch (e: any) {
        console.error("Erro ao gerar SQL:", e);
        setError(`Erro ao se comunicar com a IA: ${e.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleExecuteSql = async () => {
     if (!sqlQuery || !supabase) {
        setError('Não há consulta SQL para executar.');
        return;
    }
    setIsLoading(true);
    setError('');
    setQueryResult(null);
    
    try {
        // Supabase-js v2 doesn't have a generic "query" method for security reasons.
        // The safest way is to create a read-only database function (e.g., in the Supabase SQL editor)
        // and call it via rpc(). This prevents SQL injection.
        // Example function:
        // CREATE OR REPLACE FUNCTION execute_readonly_sql(query text)
        // RETURNS json
        // LANGUAGE plpgsql
        // AS $$
        // BEGIN
        //   IF lower(query) LIKE 'select%' THEN
        //     RETURN (SELECT array_to_json(array_agg(row_to_json(t))) FROM (EXECUTE query) t);
        //   ELSE
        //     RAISE EXCEPTION 'Apenas consultas SELECT são permitidas.';
        //   END IF;
        // END;
        // $$;

        const { data, error } = await supabase.rpc('execute_readonly_sql', { query: sqlQuery });
        
        if (error) throw error;
        
        setQueryResult(data);

    } catch (e: any) {
         console.error("Erro ao executar SQL:", e);
         setError(`Erro ao executar a consulta: ${e.message}. Verifique se a função 'execute_readonly_sql' existe no seu banco de dados Supabase e se a consulta é válida.`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-base-content">SQL Lab (Experimental)</h2>
      </div>

      <div className="bg-amber-900/50 border border-amber-500 text-amber-300 p-4 rounded-lg">
        <p className="font-bold">Atenção!</p>
        <p className="text-sm">Esta é uma ferramenta avançada. Consultas malformadas ou muito complexas podem impactar a performance do banco de dados. Use com cautela. A execução de consultas requer uma função `execute_readonly_sql` no Supabase.</p>
      </div>
      
      {!ai && (
        <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg">
            <p className="font-bold">Configuração da API Gemini necessária</p>
            <p className="text-sm">A funcionalidade de geração de SQL a partir de linguagem natural requer uma API Key do Google AI Studio. Configure a variável de ambiente `API_KEY` para habilitar este recurso.</p>
        </div>
      )}

      {/* Gemini SQL Generator */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-md space-y-4">
        <h3 className="text-xl font-bold text-base-content">1. Gerar SQL com IA</h3>
        <div>
            <label htmlFor="natural-query" className="block text-sm font-medium text-base-content-secondary mb-1">Faça uma pergunta sobre os dados:</label>
            <input 
                id="natural-query"
                type="text" 
                value={naturalQuery}
                onChange={e => setNaturalQuery(e.target.value)}
                placeholder="Ex: Qual designer produziu mais em valor na última semana?"
                className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary"
            />
        </div>
        <button 
            onClick={handleGenerateSql} 
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:bg-base-300 disabled:cursor-not-allowed"
            disabled={isLoading || !ai}
        >
            {isLoading ? 'Gerando...' : 'Gerar Consulta SQL'}
        </button>
      </div>

      {/* SQL Editor and Execution */}
      <div className="bg-base-100 p-6 rounded-2xl shadow-md space-y-4">
        <h3 className="text-xl font-bold text-base-content">2. Executar Consulta SQL</h3>
        <div>
            <label htmlFor="sql-query" className="block text-sm font-medium text-base-content-secondary mb-1">Consulta SQL (somente SELECT):</label>
            <textarea
                id="sql-query"
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                rows={5}
                className="w-full p-2 border rounded-lg bg-base-200 border-base-300 font-mono text-sm focus:ring-brand-primary focus:border-brand-primary"
                placeholder="SELECT * FROM tasks WHERE value > 50;"
            />
        </div>
        <button 
            onClick={handleExecuteSql}
            className="flex items-center bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors shadow-sm disabled:bg-base-300 disabled:cursor-not-allowed"
            disabled={isLoading || !sqlQuery}
        >
            {isLoading ? 'Executando...' : 'Executar Consulta'}
        </button>
      </div>

       {/* Results */}
        <div className="bg-base-100 p-6 rounded-2xl shadow-md">
            <h3 className="text-xl font-bold text-base-content mb-4">3. Resultados</h3>
            <div className="bg-base-200 p-4 rounded-lg min-h-[100px] max-h-[400px] overflow-auto">
                {isLoading && <p className="text-base-content-secondary">Carregando resultados...</p>}
                {error && <pre className="text-red-400 text-sm whitespace-pre-wrap">{error}</pre>}
                {queryResult && (
                    <pre className="text-green-300 text-sm whitespace-pre-wrap">
                        {JSON.stringify(queryResult, null, 2)}
                    </pre>
                )}
                 {!isLoading && !error && !queryResult && <p className="text-base-content-secondary">Os resultados da sua consulta aparecerão aqui.</p>}
            </div>
        </div>
    </div>
  );
};

export default SqlLabView;
