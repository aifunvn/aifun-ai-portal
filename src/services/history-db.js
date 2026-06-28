import { supabase }  from '../lib/supabase.js';
import { userStore } from '../stores/user-store.js';

export async function saveHistory(entry) {
  const { error } = await supabase.from('builder_history').insert({
    workspace_id:      entry.workspaceId,
    user_id:           userStore.getUser()?.id ?? null,
    builder_id:        entry.builderId,
    builder_name:      entry.builderName,
    provider:          entry.provider,
    model:             entry.model,
    tokens_prompt:     entry.tokens?.prompt     ?? 0,
    tokens_completion: entry.tokens?.completion ?? 0,
    tokens_total:      entry.tokens?.total      ?? 0,
    status:            entry.status     ?? 'completed',
    document_id:       entry.documentId ?? null,
  });
  if (error) throw error;
}

export async function listHistory(workspaceId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('builder_history')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
