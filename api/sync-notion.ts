/**
 * Sincronização manual com o Notion (rota de API).
 * Deploy: ao fazer deploy do app na Vercel (ou outro host com pasta api/), esta rota fica em /api/sync-notion.
 *
 * Variáveis de ambiente no painel do host (ex. Vercel):
 * - NOTION_API_KEY
 * - NOTION_DATABASE_ID
 * - SUPABASE_URL (ex.: https://kkoeclshogsufckkpqjj.supabase.co)
 * - SUPABASE_SERVICE_ROLE_KEY (chave service_role do Supabase, em Project Settings > API)
 */

import { createClient } from '@supabase/supabase-js';

const NOTION_VERSION = '2022-06-28';

const MEDIA_PRICES: Record<string, number> = {
  Motion: 35,
  Teaser: 45,
  Flyer: 18,
  'Catalogo/Carrossel': 35,
  'Catálogo/Carrossel': 35,
  Outros: 12,
  'Criacao de ID': 40,
  'Criação de ID': 40,
  Onibus: 45,
  'Ônibus': 45,
  'Plantão Final de Semana': 110,
};

function getProp(envKey: string, defaultName: string): string {
  const v = process.env[envKey];
  return (typeof v === 'string' && v.trim()) ? v.trim() : defaultName;
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

export default async function handler(req: { method?: string }, res: { status: (n: number) => { json: (o: object) => void }; setHeader: (k: string, v: string) => void }) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');

  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST para sincronizar.' });
    return;
  }

  const notionKey = process.env.NOTION_API_KEY?.trim();
  const notionDbId = process.env.NOTION_DATABASE_ID?.trim();
  if (!notionKey || !notionDbId) {
    res.status(500).json({ error: 'Configure NOTION_API_KEY e NOTION_DATABASE_ID nas variáveis de ambiente.' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: 'Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.' });
    return;
  }

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

  let created = 0;
  let cursor: string | undefined;

  do {
    const body: { page_size?: number; start_cursor?: string } = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const notionRes = await fetch(`https://api.notion.com/v1/databases/${notionDbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionKey}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!notionRes.ok) {
      const err = await notionRes.text();
      res.status(502).json({ error: `Notion API: ${notionRes.status} - ${err}` });
      return;
    }

    const data = await notionRes.json();
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

      const designerId = designerName ? (nameToId.get(designerName.toLowerCase()) ?? null) : null;
      const dueDate = normalizeDueDate(dueRaw);
      const mediaType = resolveMediaType(mediaTypeRaw);

      if (!designerId || !dueDate) continue;

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

      if (!error) created++;
    }
  } while (cursor);

  res.status(200).json({ created, message: `Sincronização concluída. ${created} demanda(s) importada(s) do Notion.` });
}
