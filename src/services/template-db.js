import { supabase }  from '../lib/supabase.js';
import { userStore } from '../stores/user-store.js';

export async function saveTemplate({ workspaceId, builderId, name, formData }) {
  const { data, error } = await supabase
    .from('builder_templates')
    .insert({
      workspace_id: workspaceId,
      user_id:      userStore.getUser()?.id ?? null,
      builder_id:   builderId,
      name,
      form_data:    formData,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listTemplates(workspaceId, builderId) {
  const q = supabase
    .from('builder_templates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  const { data, error } = builderId
    ? await q.eq('builder_id', builderId)
    : await q;

  if (error) throw error;
  return data ?? [];
}

export async function deleteTemplate(templateId) {
  const { error } = await supabase
    .from('builder_templates')
    .delete()
    .eq('id', templateId);
  if (error) throw error;
}
