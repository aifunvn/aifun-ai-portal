// Provider abstraction — swap mock for real providers by adding entries to PROVIDERS.
// Real providers (Claude, GPT, Gemini, OpenRouter) are wired in Sprint 6.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Mock builds a well-structured prompt from form data — simulates Claude's response
function mockBuildOutput(formData) {
  const lines = [];

  if (formData?.role) {
    lines.push(`Bạn là ${formData.role}.`);
    lines.push('');
  }

  if (formData?.goal) {
    lines.push('## Nhiệm vụ');
    lines.push(formData.goal);
    lines.push('');
  }

  if (formData?.context) {
    lines.push('## Ngữ cảnh');
    lines.push(formData.context);
    lines.push('');
  }

  if (formData?.constraints) {
    lines.push('## Ràng buộc');
    const items = formData.constraints.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (items.length > 1) {
      items.forEach((item) => lines.push(`- ${item}`));
    } else {
      lines.push(formData.constraints);
    }
    lines.push('');
  }

  const fmt = formData?.outputFormat ?? 'Đoạn văn';
  lines.push('## Yêu cầu Output');
  lines.push(`Trả lời theo định dạng: **${fmt}**`);
  lines.push('');
  lines.push('---');
  lines.push('Bắt đầu thực hiện ngay. Suy nghĩ có hệ thống và trả lời bằng tiếng Việt chuyên nghiệp.');

  return lines.join('\n');
}

const PROVIDERS = {
  mock: {
    label: 'Mock (Demo)',
    async run(metaPrompt, options) {
      await sleep(900); // simulate API latency
      const content = mockBuildOutput(options.formData);
      const pTokens = Math.ceil(metaPrompt.length / 4);
      const cTokens = Math.ceil(content.length / 4);
      return {
        content,
        provider: 'mock',
        tokens: { prompt: pTokens, completion: cTokens, total: pTokens + cTokens },
      };
    },
  },

  // Stubs for future providers — fill in Sprint 6
  claude: {
    label: 'Claude (Anthropic)',
    async run(_prompt, _options) {
      throw new Error('Claude provider not yet configured. Use mock for now.');
    },
  },
};

export async function runProvider(metaPrompt, options = {}) {
  const key = options.provider ?? 'mock';
  const provider = PROVIDERS[key];
  if (!provider) throw new Error(`Unknown provider: ${key}`);
  return provider.run(metaPrompt, options);
}

export function listProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label }));
}
