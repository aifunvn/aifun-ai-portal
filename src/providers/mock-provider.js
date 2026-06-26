function buildOutput(formData) {
  const keys = Object.keys(formData ?? {});

  // SOP Builder
  if (keys.includes('process_name')) {
    const stepLines = (formData.steps ?? '').split('\n').filter(Boolean);
    const steps = stepLines.length
      ? stepLines.map((s, i) => `${i + 1}. ${s.replace(/^\d+\.\s*/, '')}`).join('\n')
      : '1. Chua co buoc nao duoc nhap';
    return [
      `# SOP: ${formData.process_name}`,
      '',
      '## 1. Muc dich',
      formData.objective || 'Chua xac dinh.',
      '',
      '## 2. Pham vi ap dung',
      `- Phong ban: ${formData.department || 'Tat ca phong ban'}`,
      `- Nguoi chiu trach nhiem: ${formData.responsible || 'Chua xac dinh'}`,
      `- Tan suat thuc hien: ${formData.frequency || 'Khi can thiet'}`,
      '',
      '## 3. Quy trinh chi tiet',
      steps,
      '',
      '## 4. Checklist kiem tra',
      '- [ ] Da doc va hieu day du quy trinh',
      '- [ ] Da chuan bi du cong cu va tai nguyen',
      '- [ ] Da thuc hien dung theo tung buoc',
      '- [ ] Da ghi nhan ket qua va bao cao',
      '',
      '---',
      `*Tai lieu nay duoc tao tu dong boi SOP Builder — ${new Date().toLocaleDateString('vi-VN')}*`,
    ].join('\n');
  }

  // YouTube Script Builder
  if (keys.includes('topic')) {
    const points = (formData.key_points ?? '')
      .split('\n').filter(Boolean)
      .map((p, i) => `### Phan ${i + 1}: ${p}`).join('\n\n')
      || '### Phan 1: Gioi thieu van de\n\n### Phan 2: Giai phap cu the\n\n### Phan 3: Vi du thuc te';
    return [
      `# Kich ban YouTube: ${formData.topic}`,
      '',
      '## Mo dau — Hook (0:00 - 0:30)',
      `Ban co biet rang ${formData.topic} dang thay doi cach chung ta lam viec khong?`,
      `Trong video ${formData.duration ?? ''} nay, toi se chia se nhung dieu quan trong nhat ban can biet.`,
      `Hay o lai den cuoi — toi co mot bo qua dac biet danh cho ban.`,
      '',
      '## Gioi thieu (0:30 - 1:00)',
      `Xin chao, rat vui duoc gap lai cac ban! Hom nay chu de cua chung ta la: **${formData.topic}**`,
      formData.audience ? `Video nay dac biet phu hop cho: ${formData.audience}` : '',
      '',
      '## Noi dung chinh',
      points,
      '',
      '## Ket thuc va Call to Action',
      'Cac ban vua tim hieu xong nhung diem quan trong nhat.',
      formData.cta
        ? `Hanh dong ngay: ${formData.cta}`
        : 'Neu thay huu ich, hay Like va Subscribe de nhan them nhieu noi dung gia tri!',
      '',
      '---',
      `**Goi y Title:** "${formData.topic} — Huong dan day du ${new Date().getFullYear()}"`,
      `**Phong cach:** ${formData.style ?? 'Huong dan'}`,
      `**Tags:** ${formData.topic}, AI, ${formData.style ?? 'Huong dan'}, YouTube, ${new Date().getFullYear()}`,
    ].filter((l) => l !== null).join('\n');
  }

  // Prompt Builder (default)
  const lines = [];
  if (formData?.role)        { lines.push(`Ban la ${formData.role}.`, ''); }
  if (formData?.goal)        { lines.push('## Nhiem vu', formData.goal, ''); }
  if (formData?.context)     { lines.push('## Ngu canh', formData.context, ''); }
  if (formData?.constraints) {
    lines.push('## Rang buoc');
    const items = formData.constraints.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    items.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }
  const fmt = formData?.output_format ?? formData?.outputFormat ?? 'Doan van';
  lines.push(
    '## Yeu cau Output',
    `Tra loi theo dinh dang: **${fmt}**`,
    '',
    '---',
    'Bat dau thuc hien ngay. Suy nghi co he thong va tra loi bang tieng Viet chuyen nghiep.',
  );
  return lines.join('\n');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const mockProvider = {
  label: 'Mock (Demo)',
  async run(metaPrompt, options = {}) {
    await sleep(900);
    const content  = buildOutput(options.formData);
    const pTokens  = Math.ceil(metaPrompt.length / 4);
    const cTokens  = Math.ceil(content.length / 4);
    return {
      content,
      provider: 'mock',
      model:    'mock-v1',
      tokens:   { prompt: pTokens, completion: cTokens, total: pTokens + cTokens },
    };
  },
};
