export const PROMPT_BUILDER = {
  id: 'prompt-builder',
  name: 'Prompt Builder',
  description: 'Tạo prompt AI chuyên nghiệp để dùng với Claude, GPT và Gemini',
  category: 'Năng suất',
  iconSvg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"/></svg>`,

  fields: [
    {
      id: 'role',
      label: 'Vai trò',
      type: 'text',
      required: true,
      placeholder: 'VD: Chuyên gia marketing B2B với 10 năm kinh nghiệm',
      maxLength: 200,
    },
    {
      id: 'goal',
      label: 'Mục tiêu cần đạt',
      type: 'text',
      required: true,
      placeholder: 'VD: Viết email cold outreach cho khách hàng doanh nghiệp',
      maxLength: 300,
    },
    {
      id: 'context',
      label: 'Ngữ cảnh',
      type: 'textarea',
      required: false,
      placeholder: 'Thêm thông tin về tình huống, đối tượng, sản phẩm/dịch vụ...',
      maxLength: 1000,
      rows: 4,
    },
    {
      id: 'constraints',
      label: 'Ràng buộc',
      type: 'textarea',
      required: false,
      placeholder: 'VD: Không quá 200 từ, giọng văn thân thiện, không dùng từ kỹ thuật',
      maxLength: 500,
      rows: 3,
    },
    {
      id: 'outputFormat',
      label: 'Định dạng output',
      type: 'select',
      required: true,
      options: ['Đoạn văn', 'Bullet points', 'Có đánh số', 'Bảng', 'Markdown'],
    },
  ],

  buildPrompt(data) {
    const lines = [
      'Hãy tạo một prompt AI chuyên nghiệp và chi tiết dựa trên thông tin sau:',
      '',
      `Vai trò: ${data.role}`,
      `Mục tiêu: ${data.goal}`,
    ];
    if (data.context)     lines.push(`Ngữ cảnh: ${data.context}`);
    if (data.constraints) lines.push(`Ràng buộc: ${data.constraints}`);
    lines.push(`Định dạng output mong muốn: ${data.outputFormat}`);
    lines.push('');
    lines.push('Tạo một prompt hoàn chỉnh, chuyên nghiệp và hiệu quả bằng tiếng Việt.');
    lines.push('Prompt phải đủ chi tiết để Claude hoặc GPT có thể thực hiện chính xác.');
    return lines.join('\n');
  },

  buildTitle(data) {
    const goal = data.goal?.slice(0, 60) ?? 'Prompt mới';
    return `Prompt — ${goal}`;
  },
};
