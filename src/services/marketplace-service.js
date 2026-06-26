import { supabase } from '../lib/supabase.js';

// Static fallback — mirrors the DB seed data
export const STATIC_ITEMS = [
  {
    id: 'prompt-builder', name: 'Prompt Builder',
    description: 'Tao prompt AI chuyen nghiep de dung voi Claude, GPT va Gemini',
    category: 'Nang suat', plan: 'free', icon: 'sparkle', is_featured: true, is_active: true,
  },
  {
    id: 'sop-builder', name: 'SOP Builder',
    description: 'Tao quy trinh chuan (SOP) chuyen nghiep cho doanh nghiep',
    category: 'Van hanh', plan: 'starter', icon: 'document', is_featured: true, is_active: true,
  },
  {
    id: 'youtube-builder', name: 'YouTube Script Builder',
    description: 'Tao kich ban video YouTube hap dan voi cau truc chuyen nghiep',
    category: 'Noi dung', plan: 'pro', icon: 'video', is_featured: false, is_active: true,
  },
  {
    id: 'email-builder', name: 'Email Automation Builder',
    description: 'Tao chuoi email marketing, nurturing tu dong cho tung giai doan khach hang',
    category: 'Marketing', plan: 'pro', icon: 'sparkle', is_featured: false, is_active: true,
  },
  {
    id: 'sales-builder', name: 'Sales Script Builder',
    description: 'Tao kich ban ban hang thuyet phuc cho tung doi tuong khach hang',
    category: 'Kinh doanh', plan: 'starter', icon: 'sparkle', is_featured: false, is_active: true,
  },
];

export async function listItems({ query = '', plan = null } = {}) {
  try {
    let q = supabase
      .from('marketplace_items')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: true });
    if (plan) q = q.eq('plan', plan);

    const { data, error } = await q;
    if (error) throw error;

    let items = data ?? [];
    if (query) {
      const lq = query.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(lq) || i.description?.toLowerCase().includes(lq),
      );
    }
    return items;
  } catch {
    let items = STATIC_ITEMS;
    if (plan)  items = items.filter((i) => i.plan === plan);
    if (query) {
      const lq = query.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(lq) || i.description?.toLowerCase().includes(lq),
      );
    }
    return items;
  }
}

export async function getItem(id) {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } catch {
    return STATIC_ITEMS.find((i) => i.id === id) ?? null;
  }
}

export function groupByCategory(items) {
  return items.reduce((groups, item) => {
    const cat = item.category ?? 'Khac';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
    return groups;
  }, {});
}
