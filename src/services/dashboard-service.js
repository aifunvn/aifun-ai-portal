import { listInstalls }          from './install-service.js';
import { listItems as listMpItems } from './marketplace-service.js';

// Mock data keyed by workspace ID — replaced with real API calls in Sprint 5
const NOW = Date.now();
const h = (n) => NOW - n * 3_600_000;
const d = (n) => NOW - n * 86_400_000;

const DATA = {
  ws_aifun_001: {
    plan: 'Pro',
    remainingRequests: 453,
    kpis: [
      { id: 'ai-requests', label: 'AI Requests',  value: 47,     unit: '',   change: 12, positive: true  },
      { id: 'documents',   label: 'Tài liệu',      value: 23,     unit: '',   change: 5,  positive: true  },
      { id: 'tokens',      label: 'Tokens dùng',  value: 128400, unit: 'tk', change: 18, positive: true  },
      { id: 'builders',    label: 'AI Builders',   value: 6,      unit: '',   change: 0,  positive: null  },
    ],
    recentDocuments: [
      { id: 'd1', name: 'SOP Quy trình Onboard nhân viên mới',  type: 'SOP Builder',       createdAt: h(2)  },
      { id: 'd2', name: 'Email giới thiệu sản phẩm Q3 2026',    type: 'Email Automation',  createdAt: h(5)  },
      { id: 'd3', name: 'Kịch bản bán hàng AIFUN OS',           type: 'Sales Script',      createdAt: d(1)  },
      { id: 'd4', name: 'Báo cáo tháng 6 — Marketing',          type: 'Report Builder',    createdAt: d(2)  },
      { id: 'd5', name: 'Content plan tháng 7',                  type: 'Content Factory',   createdAt: d(3)  },
    ],
    installedBuilders: [
      { id: 'sop',     name: 'SOP Builder',       docs: 12 },
      { id: 'content', name: 'Content Factory',   docs: 8  },
      { id: 'email',   name: 'Email Automation',  docs: 7  },
      { id: 'crm',     name: 'CRM AI Assistant',  docs: 6  },
      { id: 'report',  name: 'Report Builder',    docs: 5  },
      { id: 'webinar', name: 'Webinar Builder',   docs: 4  },
    ],
    activityLog: [
      { id: 'a1', text: 'Tạo SOP mới — "SOP Onboard nhân viên"',          at: h(2)  },
      { id: 'a2', text: 'Xuất tài liệu — "Email giới thiệu sản phẩm"',    at: h(5)  },
      { id: 'a3', text: 'Đăng nhập AIFUN Workspace',                       at: d(1)  },
      { id: 'a4', text: 'Cài đặt AI Builder mới — "Webinar Builder"',      at: d(1)  },
      { id: 'a5', text: 'Tạo tài liệu — "Content plan tháng 7"',           at: d(3)  },
    ],
    tokensByDay: [
      { day: 'T2', tokens: 8200  },
      { day: 'T3', tokens: 15400 },
      { day: 'T4', tokens: 22100 },
      { day: 'T5', tokens: 18900 },
      { day: 'T6', tokens: 31200 },
      { day: 'T7', tokens: 19800 },
      { day: 'CN', tokens: 12800 },
    ],
  },

  ws_aifun_002: {
    plan: 'Starter',
    remainingRequests: 188,
    kpis: [
      { id: 'ai-requests', label: 'AI Requests',  value: 12,    unit: '',   change: -3, positive: false },
      { id: 'documents',   label: 'Tài liệu',      value: 5,     unit: '',   change: 2,  positive: true  },
      { id: 'tokens',      label: 'Tokens dùng',  value: 34200, unit: 'tk', change: 8,  positive: true  },
      { id: 'builders',    label: 'AI Builders',   value: 3,     unit: '',   change: 0,  positive: null  },
    ],
    recentDocuments: [
      { id: 'v1', name: 'SOP Quy trình khám bệnh thú y',          type: 'SOP Builder',      createdAt: h(6)  },
      { id: 'v2', name: 'Email thông báo lịch tiêm chủng',         type: 'Email Automation', createdAt: d(2)  },
      { id: 'v3', name: 'Kịch bản tư vấn khách hàng phòng khám',  type: 'Sales Script',     createdAt: d(4)  },
    ],
    installedBuilders: [
      { id: 'sop',   name: 'SOP Builder',      docs: 3 },
      { id: 'email', name: 'Email Automation', docs: 2 },
      { id: 'sales', name: 'Sales Script',     docs: 1 },
    ],
    activityLog: [
      { id: 'v1', text: 'Tạo SOP — "Quy trình khám bệnh thú y"',   at: h(6)  },
      { id: 'v2', text: 'Tạo Email — "Thông báo lịch tiêm chủng"',  at: d(2)  },
      { id: 'v3', text: 'Đăng nhập Vet AI Workspace',                at: d(3)  },
    ],
    tokensByDay: [
      { day: 'T2', tokens: 1200 },
      { day: 'T3', tokens: 4800 },
      { day: 'T4', tokens: 0    },
      { day: 'T5', tokens: 6100 },
      { day: 'T6', tokens: 9400 },
      { day: 'T7', tokens: 8200 },
      { day: 'CN', tokens: 4500 },
    ],
  },
};

export async function getDashboardData(workspaceId) {
  const base = DATA[workspaceId] ?? DATA.ws_aifun_001;

  // Merge real installs so the Builders KPI and card list reflect reality
  try {
    const [installIds, allItems] = await Promise.all([
      listInstalls(workspaceId),
      listMpItems(),
    ]);
    const idSet = new Set(installIds);
    const installedBuilders = allItems
      .filter((i) => idSet.has(i.id))
      .map((i) => ({ id: i.id, name: i.name, docs: 0 }));

    const kpis = base.kpis.map((k) =>
      k.id === 'builders' ? { ...k, value: installedBuilders.length } : k,
    );

    return { ...base, kpis, installedBuilders };
  } catch {
    return base;
  }
}
