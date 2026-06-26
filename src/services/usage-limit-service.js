import { supabase } from '../lib/supabase.js';

const PLAN_LIMITS = {
  free:     20,
  starter:  100,
  pro:      1000,
  business: 10000,
};

export function getDailyLimit(plan = 'free') {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export async function getUsage(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_usage_limits')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) return null;

  if (new Date(data.reset_at) <= new Date()) {
    await _resetUsage(workspaceId, data.plan);
    return { ...data, used_today: 0 };
  }
  return data;
}

export async function checkAndIncrement(workspaceId) {
  const usage = await getUsage(workspaceId);
  if (!usage) return { allowed: true, remaining: null };

  const limit = getDailyLimit(usage.plan);
  if (usage.used_today >= limit) {
    return { allowed: false, remaining: 0, limit, used: usage.used_today, plan: usage.plan };
  }

  await supabase
    .from('workspace_usage_limits')
    .update({ used_today: usage.used_today + 1, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId);

  return {
    allowed:   true,
    remaining: limit - usage.used_today - 1,
    limit,
    used:      usage.used_today + 1,
    plan:      usage.plan,
  };
}

async function _resetUsage(workspaceId, plan) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  await supabase
    .from('workspace_usage_limits')
    .update({
      used_today: 0,
      reset_at:   tomorrow.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId);
}
