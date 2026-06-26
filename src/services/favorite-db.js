import { supabase }  from '../lib/supabase.js';
import { userStore } from '../stores/user-store.js';

export async function addFavorite(workspaceId, builderId) {
  const { error } = await supabase
    .from('favorite_builders')
    .upsert({
      workspace_id: workspaceId,
      user_id:      userStore.getUser()?.id ?? null,
      builder_id:   builderId,
    }, { onConflict: 'workspace_id,builder_id,user_id' });
  if (error) throw error;
}

export async function removeFavorite(workspaceId, builderId) {
  const userId = userStore.getUser()?.id;
  const { error } = await supabase
    .from('favorite_builders')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('builder_id', builderId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function isFavorite(workspaceId, builderId) {
  const userId = userStore.getUser()?.id;
  if (!userId) return false;
  const { data, error } = await supabase
    .from('favorite_builders')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('builder_id', builderId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function listFavorites(workspaceId) {
  const userId = userStore.getUser()?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('favorite_builders')
    .select('builder_id, created_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => r.builder_id);
}
