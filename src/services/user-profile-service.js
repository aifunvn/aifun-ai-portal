import { supabase } from '../lib/supabase.js';
import { userStore } from '../stores/user-store.js';

export async function updateProfile(userId, { full_name, avatar_url }) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ full_name, avatar_url })
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) return false;

  const user = userStore.getUser();
  userStore.set({ profile: _toProfile(data, user ?? { id: userId, email: data.email ?? '' }) });
  return true;
}

export async function loadOrCreateProfile(user) {
  let row;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!error && data) {
    row = data;
  } else {
    // Create profile
    const fullName = _deriveName(user);
    const newRow   = { id: user.id, full_name: fullName, email: user.email, avatar_url: null };
    const { data: created } = await supabase
      .from('user_profiles')
      .upsert(newRow)
      .select()
      .single();
    row = created ?? newRow;
  }

  const profile = _toProfile(row, user);
  userStore.set({ profile });
  return profile;
}

function _deriveName(user) {
  return user.user_metadata?.full_name
    || user.email?.split('@')[0]
    || 'Người dùng';
}

function _toProfile(row, user) {
  const fullName = row.full_name || _deriveName(user);
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return {
    id:        row.id      ?? user.id,
    email:     row.email   ?? user.email,
    fullName,
    initials,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}
