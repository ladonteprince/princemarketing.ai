import Anthropic from '@anthropic-ai/sdk';

// 1. Singleton Claude client
const globalForClaude = globalThis as unknown as {
  claude: Anthropic | undefined;
};

export const claude = globalForClaude.claude ?? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

if (process.env.NODE_ENV !== 'production') {
  globalForClaude.claude = claude;
}

// 2. Prompt refinement — takes a raw user prompt and returns a production-grade prompt
export async function refinePrompt(
  rawPrompt: string,
  context: { type: 'image' | 'video' | 'copy'; style?: string; tone?: string }
): Promise<string> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1_024,
    system: `You are a creative director at a top-tier marketing agency. Your job is to take a raw creative brief and refine it into a precise, production-ready prompt. Be specific about visual details, composition, lighting, color palette, and mood. Never use hype words. Output ONLY the refined prompt — no preamble, no explanation.`,
    messages: [
      {
        role: 'user',
        content: `Refine this ${context.type} prompt for production use.\n\nRaw prompt: ${rawPrompt}\n${context.style ? `Style: ${context.style}` : ''}\n${context.tone ? `Tone: ${context.tone}` : ''}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text ?? rawPrompt;
}

// 3. Copy generation — produces marketing copy via Claude
export async function generateCopy(params: {
  prompt: string;
  copyType: string;
  tone: string;
  maxLength: number;
  brand?: string;
}): Promise<string> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: params.maxLength * 2,
    system: `You are an elite marketing copywriter. Write ${params.copyType} copy that is direct, compelling, and conversion-focused. Tone: ${params.tone}. ${params.brand ? `Brand context: ${params.brand}` : ''} Never use words like "revolutionary", "seamless", "cutting-edge", "game-changing". Output ONLY the copy — no preamble.`,
    messages: [
      {
        role: 'user',
        content: params.prompt,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
}
