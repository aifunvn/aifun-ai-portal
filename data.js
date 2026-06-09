/* ============================================================
   AIFUN AI Portal V2.0 — data.js
   Single source of truth + 3-tier data loader:
   Tier 1 → Google Sheets API v4  (config.js + sheets.js)
   Tier 2 → JSON files            (data/*.json)
   Tier 3 → Static fallback       (constants trong file này)
   ============================================================ */

'use strict';

import {
  fetchAllFromSheets,
  fetchGoogleSheetsData,
  loadPromptsFromSheet,
  loadSkillsFromSheet,
  loadSopsFromSheet,
  loadProjectsFromSheet,
  loadWorkflowsFromSheet,
  testConnection,
  getSheetsStatus,
  startAutoRefresh,
  stopAutoRefresh,
  invalidateSheetsCache,
} from './sheets.js';

export {
  fetchGoogleSheetsData,
  loadPromptsFromSheet,
  loadSkillsFromSheet,
  loadSopsFromSheet,
  loadProjectsFromSheet,
  loadWorkflowsFromSheet,
  testConnection,
  getSheetsStatus,
  startAutoRefresh,
  stopAutoRefresh,
  invalidateSheetsCache,
};

/* ── AI TOOLS ─────────────────────────────────────────────── */
export const AI_TOOLS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: '💬',
    color: 'chatgpt',
    url: 'https://chat.openai.com',
    desc: 'Mô hình ngôn ngữ lớn từ OpenAI. GPT-4o hỗ trợ văn bản, hình ảnh, file và web browsing.',
    tags: ['Text', 'Vision', 'Code'],
    uses: 2341,
    status: 'active',
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: '🧠',
    color: 'claude',
    url: 'https://claude.ai',
    desc: 'AI của Anthropic. Claude Sonnet 4 — phân tích sâu, viết chuyên nghiệp, code, Projects.',
    tags: ['Analysis', 'Writing', 'Code'],
    uses: 1892,
    status: 'active',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    icon: '✨',
    color: 'gemini',
    url: 'https://gemini.google.com',
    desc: 'AI đa phương thức của Google. Tích hợp Google Workspace, Search thời gian thực.',
    tags: ['Multimodal', 'Search', 'Google'],
    uses: 987,
    status: 'active',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '🔍',
    color: 'perplexity',
    url: 'https://www.perplexity.ai',
    desc: 'AI Search Engine. Tìm kiếm thông minh với nguồn trích dẫn rõ ràng, cập nhật real-time.',
    tags: ['Search', 'Research', 'Real-time'],
    uses: 654,
    status: 'active',
  },
  {
    id: 'canva',
    name: 'Canva',
    icon: '🎨',
    color: 'canva',
    url: 'https://www.canva.com',
    desc: 'Thiết kế đồ họa với AI. Magic Design, text-to-image, template chuyên nghiệp.',
    tags: ['Design', 'Image', 'Template'],
    uses: 1205,
    status: 'active',
  },
  {
    id: 'make',
    name: 'Make',
    icon: '⚙️',
    color: 'make',
    url: 'https://www.make.com',
    desc: 'Nền tảng automation No-code. Kết nối 1000+ ứng dụng, tự động hóa quy trình doanh nghiệp.',
    tags: ['Automation', 'No-code', 'Integration'],
    uses: 432,
    status: 'active',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '💻',
    color: 'github',
    url: 'https://github.com',
    desc: 'Quản lý source code với GitHub Copilot AI. Version control, CI/CD, collaboration.',
    tags: ['Code', 'Git', 'Copilot'],
    uses: 318,
    status: 'active',
  },
];

/* ── PROMPT LIBRARY ───────────────────────────────────────── */
export const PROMPTS = [
  {
    id: 'p01',
    title: 'Viết email marketing chuyên nghiệp',
    category: 'marketing',
    tool: 'Claude',
    content: 'Bạn là chuyên gia email marketing. Hãy viết email marketing cho sản phẩm [TÊN SẢN PHẨM] với mục tiêu [MỤC TIÊU]. Đối tượng: [ĐỐI TƯỢNG]. Tone: chuyên nghiệp, thuyết phục. Bao gồm: subject line hấp dẫn, mở đầu hook, nội dung giá trị, CTA rõ ràng, P.S cuối email.',
    tags: ['Email', 'Marketing', 'B2B'],
    uses: 342,
    rating: 5,
  },
  {
    id: 'p02',
    title: 'Script gọi điện bán hàng cold call',
    category: 'sales',
    tool: 'ChatGPT',
    content: 'Tạo script gọi điện cold call cho sản phẩm [SẢN PHẨM]. Thời gian: 3 phút. Bao gồm: mở đầu tạo sự tò mò trong 10 giây, xác định vấn đề khách hàng, trình bày giải pháp, xử lý 3 từ chối phổ biến, CTA đặt lịch hẹn.',
    tags: ['Cold Call', 'Sales', 'Script'],
    uses: 218,
    rating: 4,
  },
  {
    id: 'p03',
    title: 'Kịch bản video TikTok 60 giây',
    category: 'content',
    tool: 'Claude',
    content: 'Viết kịch bản TikTok 60 giây cho chủ đề [CHỦ ĐỀ]. Cấu trúc: Hook mạnh 0-3 giây (câu hỏi/tuyên bố gây sốc), nội dung giá trị 4-50 giây (3 điểm chính), CTA 51-60 giây. Ngôn ngữ: tự nhiên, gen Z friendly, có emoji phù hợp.',
    tags: ['TikTok', 'Video', 'Script'],
    uses: 189,
    rating: 5,
  },
  {
    id: 'p04',
    title: 'Phân tích đối thủ cạnh tranh SWOT',
    category: 'analysis',
    tool: 'Perplexity',
    content: 'Phân tích chi tiết đối thủ [TÊN CÔNG TY] trong ngành [NGÀNH]. Bao gồm: 1) Tổng quan công ty (quy mô, thị phần, USP), 2) Phân tích SWOT đầy đủ, 3) Chiến lược marketing hiện tại, 4) Điểm yếu có thể khai thác, 5) Cơ hội khác biệt hóa cho chúng tôi.',
    tags: ['SWOT', 'Research', 'Strategy'],
    uses: 156,
    rating: 4,
  },
  {
    id: 'p05',
    title: 'Mô tả công việc (JD) hấp dẫn',
    category: 'hr',
    tool: 'ChatGPT',
    content: 'Viết JD cho vị trí [VỊ TRÍ] tại công ty [CÔNG TY] trong ngành [NGÀNH]. Bao gồm: mô tả công ty hấp dẫn (3 dòng), trách nhiệm chính (5-7 điểm), yêu cầu bắt buộc, yêu cầu ưu tiên, quyền lợi nổi bật. Tone: năng động, thu hút top talent.',
    tags: ['Recruitment', 'HR', 'JD'],
    uses: 134,
    rating: 5,
  },
  {
    id: 'p06',
    title: 'Bài viết LinkedIn Thought Leader',
    category: 'content',
    tool: 'Claude',
    content: 'Viết bài LinkedIn về [CHỦ ĐỀ] theo phong cách thought leader. Cấu trúc: hook đầu 2 dòng (gây tò mò), câu chuyện cá nhân ngắn, 3 insight giá trị, bài học rút ra, CTA tương tác. Dài 150-200 từ. Kết thúc bằng hashtag phù hợp.',
    tags: ['LinkedIn', 'Personal Brand', 'Content'],
    uses: 267,
    rating: 5,
  },
  {
    id: 'p07',
    title: 'Xây dựng SOP cho bộ phận',
    category: 'operations',
    tool: 'Claude',
    content: 'Xây dựng SOP chi tiết cho quy trình [TÊN QUY TRÌNH] của bộ phận [BỘ PHẬN]. Bao gồm: 1) Mục đích và phạm vi, 2) Người thực hiện và trách nhiệm, 3) Các bước thực hiện (step-by-step với checklist), 4) Công cụ cần thiết, 5) KPI đo lường, 6) Xử lý ngoại lệ.',
    tags: ['SOP', 'Operations', 'Process'],
    uses: 198,
    rating: 5,
  },
  {
    id: 'p08',
    title: 'Kế hoạch Marketing 90 ngày',
    category: 'marketing',
    tool: 'Claude',
    content: 'Lập kế hoạch marketing 90 ngày cho [SẢN PHẨM/DỊCH VỤ] với ngân sách [NGÂN SÁCH]. Bao gồm: Tháng 1 (xây dựng nền tảng), Tháng 2 (tăng tốc), Tháng 3 (tối ưu). Mỗi tháng: chiến lược kênh, lịch content, KPI cụ thể, ngân sách phân bổ.',
    tags: ['Marketing Plan', 'Strategy', '90 Days'],
    uses: 145,
    rating: 4,
  },
  {
    id: 'p09',
    title: 'Proposal bán hàng thuyết phục',
    category: 'sales',
    tool: 'Claude',
    content: 'Viết proposal cho [KHÁCH HÀNG] để cung cấp [GIẢI PHÁP]. Bao gồm: Executive Summary (1 trang), Phân tích vấn đề khách hàng, Giải pháp đề xuất chi tiết, Timeline triển khai, ROI dự kiến, Pricing (3 gói), Terms & Conditions. Tone: chuyên nghiệp, tập trung vào giá trị.',
    tags: ['Proposal', 'B2B', 'Sales'],
    uses: 112,
    rating: 5,
  },
  {
    id: 'p10',
    title: 'Phân tích dữ liệu kinh doanh',
    category: 'analysis',
    tool: 'ChatGPT',
    content: 'Phân tích dữ liệu kinh doanh sau: [DÁN DỮ LIỆU]. Hãy: 1) Tóm tắt xu hướng chính, 2) Xác định 3 insight quan trọng nhất, 3) So sánh với benchmark ngành, 4) Chỉ ra điểm bất thường cần chú ý, 5) Đề xuất 3 hành động ưu tiên dựa trên data.',
    tags: ['Data', 'Analytics', 'Business Intelligence'],
    uses: 89,
    rating: 4,
  },
  {
    id: 'p11',
    title: 'Automation workflow với Make',
    category: 'automation',
    tool: 'Claude',
    content: 'Thiết kế workflow automation với Make cho quy trình: [MÔ TẢ QUY TRÌNH]. Bao gồm: 1) Sơ đồ luồng dữ liệu, 2) Các module Make cần dùng, 3) Trigger và điều kiện, 4) Xử lý lỗi, 5) Testing plan. Tối ưu để giảm số operation và tăng tốc độ xử lý.',
    tags: ['Make', 'Automation', 'Workflow'],
    uses: 176,
    rating: 5,
  },
  {
    id: 'p12',
    title: 'Script Webinar bán hàng',
    category: 'sales',
    tool: 'Claude',
    content: 'Viết script webinar 60 phút để bán [SẢN PHẨM]. Cấu trúc: 0-10 phút (hook + agenda), 10-35 phút (giá trị + case study), 35-50 phút (pitch sản phẩm + demo), 50-60 phút (Q&A + offer đặc biệt). Bao gồm slide outline, câu chuyện, objection handling.',
    tags: ['Webinar', 'Sales', 'Presentation'],
    uses: 203,
    rating: 5,
  },
];

/* ── SKILLS ───────────────────────────────────────────────── */
export const SKILLS = [
  {
    id: 'sop-builder',
    name: 'SOP Builder',
    category: 'Operations',
    icon: '📋',
    gradient: 'linear-gradient(135deg,#1e40af,#3b82f6)',
    desc: 'Tự động xây dựng quy trình vận hành chuẩn (SOP) cho mọi bộ phận doanh nghiệp với AI.',
    uses: 342,
    time: '~5 phút',
    rating: 5,
  },
  {
    id: 'content-ai',
    name: 'Content AI',
    category: 'Marketing',
    icon: '✍️',
    gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)',
    desc: 'Sản xuất nội dung đa kênh: blog, social, email, video script chỉ từ 1 ý tưởng.',
    uses: 891,
    time: '~3 phút',
    rating: 5,
  },
  {
    id: 'video-factory',
    name: 'Video Factory',
    category: 'Media',
    icon: '🎬',
    gradient: 'linear-gradient(135deg,#dc2626,#ef4444)',
    desc: 'Tạo kịch bản, storyboard và lên kế hoạch sản xuất video chuyên nghiệp từ A-Z.',
    uses: 215,
    time: '~10 phút',
    rating: 4,
  },
  {
    id: 'marketing-planner',
    name: 'Marketing Planner',
    category: 'Marketing',
    icon: '📈',
    gradient: 'linear-gradient(135deg,#d97706,#f59e0b)',
    desc: 'Lập kế hoạch marketing 90 ngày toàn diện với ngân sách, KPI và lịch thực thi.',
    uses: 178,
    time: '~15 phút',
    rating: 5,
  },
  {
    id: 'crm-builder',
    name: 'CRM Builder',
    category: 'Sales',
    icon: '🤝',
    gradient: 'linear-gradient(135deg,#0891b2,#06b6d4)',
    desc: 'Thiết kế hệ thống CRM, phễu bán hàng và quy trình chăm sóc khách hàng tự động.',
    uses: 134,
    time: '~20 phút',
    rating: 4,
  },
  {
    id: 'automation-builder',
    name: 'Automation Builder',
    category: 'Operations',
    icon: '⚙️',
    gradient: 'linear-gradient(135deg,#059669,#10b981)',
    desc: 'Thiết kế workflow tự động hóa với Make, Zapier, Google Apps Script cho doanh nghiệp.',
    uses: 267,
    time: '~25 phút',
    rating: 5,
  },
  {
    id: 'webinar-builder',
    name: 'Webinar Builder',
    category: 'Education',
    icon: '🎤',
    gradient: 'linear-gradient(135deg,#be185d,#ec4899)',
    desc: 'Xây dựng chương trình Webinar từ A-Z: nội dung, slide, email sequence, landing page.',
    uses: 156,
    time: '~30 phút',
    rating: 4,
  },
  {
    id: 'course-builder',
    name: 'Course Builder',
    category: 'Education',
    icon: '🎓',
    gradient: 'linear-gradient(135deg,#0369a1,#0ea5e9)',
    desc: 'Thiết kế khóa học online chuyên nghiệp: outline, bài giảng, quiz, assignment, certificate.',
    uses: 203,
    time: '~45 phút',
    rating: 5,
  },
  {
    id: 'sales-assistant',
    name: 'Sales Assistant',
    category: 'Sales',
    icon: '💰',
    gradient: 'linear-gradient(135deg,#ea580c,#f97316)',
    desc: 'Trợ lý bán hàng AI: xử lý từ chối, tạo proposal, script tư vấn và closing deal.',
    uses: 445,
    time: '~5 phút',
    rating: 5,
  },
  {
    id: 'ceo-dashboard',
    name: 'CEO Dashboard',
    category: 'Leadership',
    icon: '👑',
    gradient: 'linear-gradient(135deg,#1e3a5f,#1e40af)',
    desc: 'Tổng quan điều hành toàn diện: KPI, doanh thu, team performance, strategic planning.',
    uses: 89,
    time: '~10 phút',
    rating: 5,
  },
];

/* ── PROJECTS ─────────────────────────────────────────────── */
export const PROJECTS = [
  {
    id: 'proj-01',
    name: 'AIFUN AI Portal V2.0',
    description: 'Web application · Next.js · Claude API · Google Sheets',
    color: 'blue',
    progress: 80,
    status: 'inprogress',
    statusLabel: 'Đang làm',
    deadline: '30/06/2026',
    updatedAt: '09/06/2026',
    team: ['DTC', 'NV', 'TT'],
  },
  {
    id: 'proj-02',
    name: 'Veterinary AI System',
    description: 'AI Platform · Python · FastAPI · Claude API',
    color: 'purple',
    progress: 45,
    status: 'inprogress',
    statusLabel: 'Đang làm',
    deadline: '31/08/2026',
    updatedAt: '07/06/2026',
    team: ['DTC', 'LM'],
  },
  {
    id: 'proj-03',
    name: 'BNI Rainbow Growth Plan',
    description: 'Strategy · Automation · Zalo OA · Make',
    color: 'green',
    progress: 90,
    status: 'review',
    statusLabel: 'Review',
    deadline: '15/06/2026',
    updatedAt: '08/06/2026',
    team: ['DTC'],
  },
  {
    id: 'proj-04',
    name: 'AI Business OS — SME Package',
    description: 'Product · Claude Skills · Google Workspace · Automation',
    color: 'orange',
    progress: 60,
    status: 'inprogress',
    statusLabel: 'Đang làm',
    deadline: '31/07/2026',
    updatedAt: '06/06/2026',
    team: ['DTC', 'PH'],
  },
  {
    id: 'proj-05',
    name: 'AIFUN Academy — Khóa 3',
    description: 'Education · Course Builder · Webinar · LMS',
    color: 'teal',
    progress: 30,
    status: 'planning',
    statusLabel: 'Lên kế hoạch',
    deadline: '01/09/2026',
    updatedAt: '05/06/2026',
    team: ['DTC', 'NV'],
  },
];

/* ── SOPs ─────────────────────────────────────────────────── */
export const SOPS = [
  { id: 's01', name: 'Onboarding nhân viên mới', dept: 'HR', status: 'active', updated: '01/06/2026' },
  { id: 's02', name: 'Quy trình tuyển dụng', dept: 'HR', status: 'active', updated: '28/05/2026' },
  { id: 's03', name: 'Đánh giá hiệu suất KPI', dept: 'HR', status: 'active', updated: '15/05/2026' },
  { id: 's04', name: 'Quy trình offboarding', dept: 'HR', status: 'updating', updated: '—' },
  { id: 's05', name: 'Quy trình chốt sale', dept: 'Sales', status: 'active', updated: '05/06/2026' },
  { id: 's06', name: 'Follow-up khách hàng', dept: 'Sales', status: 'active', updated: '02/06/2026' },
  { id: 's07', name: 'Xử lý từ chối mua hàng', dept: 'Sales', status: 'active', updated: '20/05/2026' },
  { id: 's08', name: 'Quy trình demo sản phẩm', dept: 'Sales', status: 'active', updated: '10/05/2026' },
  { id: 's09', name: 'Script tư vấn dịch vụ', dept: 'Sales', status: 'active', updated: '08/06/2026' },
  { id: 's10', name: 'Lập kế hoạch content tháng', dept: 'Marketing', status: 'active', updated: '01/06/2026' },
  { id: 's11', name: 'Quy trình chạy quảng cáo', dept: 'Marketing', status: 'active', updated: '25/05/2026' },
  { id: 's12', name: 'Tổ chức Webinar', dept: 'Marketing', status: 'updating', updated: '—' },
  { id: 's13', name: 'Email marketing campaign', dept: 'Marketing', status: 'active', updated: '12/05/2026' },
  { id: 's14', name: 'Social media daily post', dept: 'Marketing', status: 'active', updated: '03/06/2026' },
  { id: 's15', name: 'Quy trình báo cáo tuần', dept: 'Operations', status: 'active', updated: '07/06/2026' },
  { id: 's16', name: 'Họp team standup daily', dept: 'Operations', status: 'active', updated: '01/06/2026' },
  { id: 's17', name: 'Kiểm soát chất lượng sản phẩm', dept: 'Operations', status: 'updating', updated: '—' },
  { id: 's18', name: 'Quản lý dự án AI', dept: 'Operations', status: 'active', updated: '20/05/2026' },
  { id: 's19', name: 'Xử lý khiếu nại khách hàng', dept: 'Customer Service', status: 'active', updated: '04/06/2026' },
  { id: 's20', name: 'Chăm sóc khách hàng sau bán', dept: 'Customer Service', status: 'active', updated: '02/06/2026' },
  { id: 's21', name: 'Quy trình hoàn tiền', dept: 'Customer Service', status: 'active', updated: '28/05/2026' },
  { id: 's22', name: 'Lập ngân sách tháng', dept: 'Finance', status: 'active', updated: '01/06/2026' },
  { id: 's23', name: 'Quy trình thanh toán nhà cung cấp', dept: 'Finance', status: 'active', updated: '15/05/2026' },
  { id: 's24', name: 'Báo cáo tài chính hàng tháng', dept: 'Finance', status: 'updating', updated: '—' },
];

/* ── DASHBOARD STATS (computed) ──────────────────────────── */
export function getDashboardStats(overrides = {}) {
  const skills   = overrides.skills   || SKILLS;
  const projects = overrides.projects || PROJECTS;
  const sops     = overrides.sops     || SOPS;
  const prompts  = overrides.prompts  || PROMPTS;
  return {
    totalSkills:   skills.length,
    totalProjects: projects.length,
    totalSOPs:     sops.length,
    totalPrompts:  prompts.length,
    activeSOPs:    sops.filter(s => s.status === 'active').length,
    activeProjects:projects.filter(p => p.status === 'inprogress').length,
    promptUses:    prompts.reduce((sum, p) => sum + (p.uses || 0), 0),
    revenue:       '₫248,500,000',
    revenueGrowth: '+8.2%',
    newCustomers:  47,
    convRate:      '34.2%',
    aiRequests:    3841,
    automations:   18,
  };
}

/* ── JSON HELPER (dùng nội bộ) ───────────────────────────── */
async function _fetchJSON(name, fallback) {
  try {
    const res = await fetch(`./data/${name}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty array');
    return data;
  } catch (err) {
    console.warn(`[DataLoader] JSON ${name}.json thất bại — dùng static.`, err.message);
    return fallback;
  }
}

/* ═══════════════════════════════════════════════════════════
   3-TIER DATA LOADER
   ═══════════════════════════════════════════════════════════
   Tier 1: Google Sheets API v4  — real-time, source of truth
   Tier 2: ./data/*.json files   — bản sao offline đã chuẩn bị
   Tier 3: Inline static data    — fallback cuối cùng, không bao giờ crash
   ─────────────────────────────────────────────────────────
   Trả về: { prompts, skills, projects, sops, workflows?, _source }
   _source: 'sheets' | 'json' | 'static'
   ═══════════════════════════════════════════════════════════ */
export async function loadData() {

  // ── Tier 1: Google Sheets ─────────────────────────────────
  try {
    const sheetsData = await fetchAllFromSheets();
    console.info('[DataLoader] ✅ Tier 1 — Google Sheets');

    // Sheets có thể trả về null cho sheets bị lỗi → fallback từng cái
    const [jsonPrompts, jsonSkills, jsonProjects, jsonSops] = await Promise.all([
      sheetsData.prompts   ? Promise.resolve(sheetsData.prompts)   : _fetchJSON('prompts',  PROMPTS),
      sheetsData.skills    ? Promise.resolve(sheetsData.skills)    : _fetchJSON('skills',   SKILLS),
      sheetsData.projects  ? Promise.resolve(sheetsData.projects)  : _fetchJSON('projects', PROJECTS),
      sheetsData.sops      ? Promise.resolve(sheetsData.sops)      : _fetchJSON('sops',     SOPS),
    ]);

    return {
      prompts:   jsonPrompts,
      skills:    jsonSkills,
      projects:  jsonProjects,
      sops:      jsonSops,
      workflows: sheetsData.workflows || null,
      _source:   'sheets',
      _partial:  sheetsData._partial,
      _fetchedAt: sheetsData._fetchedAt,
    };
  } catch (sheetsErr) {
    console.warn('[DataLoader] Tier 1 thất bại → thử Tier 2.', sheetsErr.message);
  }

  // ── Tier 2: JSON files ────────────────────────────────────
  try {
    const [prompts, skills, projects, sops] = await Promise.all([
      _fetchJSON('prompts',  null),
      _fetchJSON('skills',   null),
      _fetchJSON('projects', null),
      _fetchJSON('sops',     null),
    ]);

    const anyLoaded = [prompts, skills, projects, sops].some(d => Array.isArray(d) && d.length > 0);
    if (!anyLoaded) throw new Error('Tất cả JSON files đều rỗng hoặc không tồn tại');

    console.info('[DataLoader] ✅ Tier 2 — JSON files');
    return {
      prompts:   prompts   || PROMPTS,
      skills:    skills    || SKILLS,
      projects:  projects  || PROJECTS,
      sops:      sops      || SOPS,
      workflows: null,
      _source:   'json',
    };
  } catch (jsonErr) {
    console.warn('[DataLoader] Tier 2 thất bại → Tier 3 (static).', jsonErr.message);
  }

  // ── Tier 3: Static inline data ────────────────────────────
  console.info('[DataLoader] ✅ Tier 3 — static data');
  return {
    prompts:   PROMPTS,
    skills:    SKILLS,
    projects:  PROJECTS,
    sops:      SOPS,
    workflows: null,
    _source:   'static',
  };
}

/* ── AUTOMATIONS ──────────────────────────────────────────── */
export const AUTOMATIONS = [
  {
    id: 'auto-01',
    name: 'Email Nurturing Sequence',
    tools: 'Make · Gmail',
    icon: '📧',
    iconBg: '#eff6ff',
    desc: 'Tự động gửi chuỗi 7 email nurturing sau khi lead đăng ký. Cá nhân hóa theo segment.',
    runs: '1,245 lần/tháng',
    saved: '48h tiết kiệm',
    tags: ['Gmail', 'Make', 'CRM'],
    active: true,
  },
  {
    id: 'auto-02',
    name: 'CRM Lead Scoring AI',
    tools: 'Make · Claude API',
    icon: '🤝',
    iconBg: '#ecfdf5',
    desc: 'Chấm điểm lead tự động với AI dựa trên hành vi, nguồn và mức độ tương tác.',
    runs: '284 lần/tháng',
    saved: '56h tiết kiệm',
    tags: ['AI', 'CRM', 'Make'],
    active: true,
  },
  {
    id: 'auto-03',
    name: 'Zalo OA Auto Response',
    tools: 'Zalo API · Make',
    icon: '📱',
    iconBg: '#f5f3ff',
    desc: 'Tự động trả lời tin nhắn Zalo OA với AI. Chuyển hướng đến sales khi đủ điều kiện.',
    runs: '3,200 lần/tháng',
    saved: '160h tiết kiệm',
    tags: ['Zalo', 'AI', 'Chatbot'],
    active: true,
  },
  {
    id: 'auto-04',
    name: 'Weekly KPI Report',
    tools: 'Google Sheets · Gmail',
    icon: '📊',
    iconBg: '#fef3c7',
    desc: 'Tổng hợp KPI tuần từ Google Sheets, tạo báo cáo PDF và gửi email cho CEO mỗi thứ Hai.',
    runs: '4 lần/tháng',
    saved: '8h tiết kiệm',
    tags: ['Google', 'PDF', 'Report'],
    active: true,
  },
  {
    id: 'auto-05',
    name: 'Social Media Scheduler',
    tools: 'Make · Buffer',
    icon: '🎬',
    iconBg: '#fce7f3',
    desc: 'Lên lịch đăng bài tự động trên Facebook, TikTok, LinkedIn từ Google Drive.',
    runs: '90 lần/tháng',
    saved: '30h tiết kiệm',
    tags: ['Facebook', 'TikTok', 'LinkedIn'],
    active: true,
  },
  {
    id: 'auto-06',
    name: 'Birthday Greeting Bot',
    tools: 'CRM · Gmail · Zalo',
    icon: '🎂',
    iconBg: '#f1f5f9',
    desc: 'Tự động gửi lời chúc sinh nhật cá nhân hóa qua email và Zalo cho khách hàng.',
    runs: '0 lần/tháng',
    saved: '0h tháng này',
    tags: ['CRM', 'Email', 'Zalo'],
    active: false,
  },
];

/* ── COURSES (Training) ───────────────────────────────────── */
export const COURSES = [
  {
    id: 'c01',
    title: 'AI Business OS — Xây dựng hệ điều hành AI cho doanh nghiệp',
    level: 'intermediate',
    levelLabel: 'Intermediate',
    thumb: 'ai-os',
    desc: 'Học cách thiết kế và triển khai hệ thống AI hoàn chỉnh cho SME trong 30 ngày.',
    modules: 12,
    hours: 24,
    students: 234,
    badge: '🔥 Hot',
  },
  {
    id: 'c02',
    title: 'Prompt Engineering Mastery',
    level: 'beginner',
    levelLabel: 'Beginner',
    thumb: 'prompt-eng',
    desc: 'Kỹ thuật viết prompt hiệu quả cho ChatGPT, Claude và Gemini trong công việc hàng ngày.',
    modules: 8,
    hours: 12,
    students: 567,
    badge: null,
  },
  {
    id: 'c03',
    title: 'Make Automation Pro',
    level: 'advanced',
    levelLabel: 'Advanced',
    thumb: 'automation',
    desc: 'Tự động hóa hoàn toàn quy trình kinh doanh với Make và AI. Kết nối 50+ ứng dụng.',
    modules: 10,
    hours: 20,
    students: 189,
    badge: null,
  },
];

// ─── Xem config.js để cấu hình Google Sheets ─────────────────────
// Xem sheets.js để hiểu cơ chế fetch + cache + fallback
