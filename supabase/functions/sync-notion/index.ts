// Edge Function: sincroniza demandas de um database do Notion para a tabela tasks do Supabase.
// Variáveis de ambiente (secrets): NOTION_API_KEY, NOTION_DATABASE_ID
// Opcionais: NOTION_PROP_DESIGNER, NOTION_PROP_MEDIA_TYPE, NOTION_PROP_DUE, NOTION_PROP_ARTIST, NOTION_PROP_SOCIAL, NOTION_PROP_DESCRIPTION
// O database do Notion deve estar compartilhado com a integração (Add connections).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NOTION_VERSION = '2022-06-28';

// Valores por tipo de mídia (espelhar constants.ts do app)
const MEDIA_PRICES: Record<string, number> = {
  'Motion': 35,
  'Teaser': 45,
  'Flyer': 18,
  'Catalogo/Carrossel': 35,
  'Catálogo/Carrossel': 35,
  'Outros': 12,
  'Criacao de ID': 40,
  'Criação de ID': 40,
  'Onibus': 45,
  'Ônibus': 45,
  'Plantão Final de Semana': 110,
};

function getProp(envKey: string, defaultName: string): string {
  return Deno.env.get(envKey)?.trim() || defaultName;
}

function getPropStr(prop: Record<string, unknown> | undefined): string {
  if (!prop || typeof prop !== 'object') return '';
  if (prop.type === 'title' && Array.isArray(prop.title)) {
    const t = prop.title[0];
    return (t && typeof t === 'object' && 'plain_text' in t) ? String((t as { plain_text: string }).plain_text).trim() : '';
  }
  if (prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
    const t = prop.rich_text[0];
    return (t && typeof t === 'object' && 'plain_text' in t) ? String((t as { plain_text: string }).plain_text).trim() : '';
  }
  if (prop.type === 'select' && prop.select && typeof prop.select === 'object' && 'name' in prop.select) {
    return String((prop.select as { name: string }).name).trim();
  }
  if (prop.type === 'date' && prop.date && typeof prop.date === 'object' && 'start' in prop.date) {
    return String((prop.date as { start: string }).start).trim().slice(0, 10);
  }
  return '';
}

function normalizeDueDate(raw: string): string | null {
  const s = raw.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function resolveMediaType(raw: string): string {
  const key = Object.keys(MEDIA_PRICES).find(k => k.toLowerCase() === raw.toLowerCase()) || raw.trim() || 'Outros';
  return MEDIA_PRICES[key] !== undefined ? key : 'Outros';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  const notionKey = Deno.env.get('NOTION_API_KEY')?.trim();
  const notionDbId = Deno.env.get('NOTION_DATABASE_ID')?.trim();
  if (!notionKey || !notionDbId) {
    return new Response(
      JSON.stringify({ error: 'NOTION_API_KEY e NOTION_DATABASE_ID devem estar configurados nos secrets da Edge Function.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const propDesigner = getProp('NOTION_PROP_DESIGNER', 'Designer');
  const propMediaType = getProp('NOTION_PROP_MEDIA_TYPE', 'Tipo de mídia');
  const propDue = getProp('NOTION_PROP_DUE', 'Data de entrega');
  const propArtist = getProp('NOTION_PROP_ARTIST', 'Artista');
  const propSocial = getProp('NOTION_PROP_SOCIAL', 'Rede social');
  const propDescription = getProp('NOTION_PROP_DESCRIPTION', 'Descrição');

  const { data: designers } = await supabase.from('designers').select('id, name');
  const nameToId = new Map<string, string>();
  for (const d of designers ?? []) {
    if (d?.name) nameToId.set(String(d.name).trim().toLowerCase(), d.id);
  }
  const firstDesignerId = (designers ?? [])[0]?.id ?? null;

  let created = 0;
  let cursor: string | undefined;
  const seenPageIds = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  do {
    const body: { page_size?: number; start_cursor?: string } = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${notionDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionKey}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(
        JSON.stringify({ error: `Notion API: ${res.status} - ${err}` }),
        { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const data = await res.json();
    const results = data.results ?? [];
    cursor = data.next_cursor ?? undefined;

    for (const page of results) {
      if (!page?.id || page.archived === true || page.in_trash === true) continue;
      const props = page.properties ?? {};
      const designerName = getPropStr(props[propDesigner]);
      const mediaTypeRaw = getPropStr(props[propMediaType]);
      const dueRaw = getPropStr(props[propDue]);
      const artist = getPropStr(props[propArtist]) || '-';
      const social = getPropStr(props[propSocial]) || '-';
      const description = getPropStr(props[propDescription]) || '-';

      const designerId = (designerName ? nameToId.get(designerName.toLowerCase()) : null) ?? firstDesignerId;
      const dueDate = normalizeDueDate(dueRaw) ?? today;
      const mediaType = resolveMediaType(mediaTypeRaw);

      if (!designerId) continue;

      const { data: existing } = await supabase.from('tasks').select('id').eq('notion_page_id', page.id).maybeSingle();
      if (existing) continue;

      const value = MEDIA_PRICES[mediaType] ?? MEDIA_PRICES['Outros'] ?? 12;
      const { error } = await supabase.from('tasks').insert({
        designer_id: designerId,
        media_type: mediaType,
        due_date: dueDate,
        artist,
        social_media: social,
        description,
        value,
        approval_status: 'approved',
        notion_page_id: page.id,
      });

      if (!error) {
        created++;
        seenPageIds.add(page.id);
      }
    }
  } while (cursor);

  return new Response(
    JSON.stringify({ created, message: `Sincronização concluída. ${created} demanda(s) importada(s) do Notion.` }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
});
