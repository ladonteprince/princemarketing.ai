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
  context: {
    type: 'image' | 'video' | 'copy';
    style?: string;
    tone?: string;
    referenceImages?: ReadonlyArray<{ url: string; label?: string }>;
  }
): Promise<string> {
  // Build reference image context for the refinement prompt
  let imageContext = '';
  if (context.referenceImages && context.referenceImages.length > 0) {
    const imageDescriptions = context.referenceImages.map((img, i) => {
      const tag = `@image${i + 1}`;
      const label = img.label ?? `reference image ${i + 1}`;
      return `  ${tag} = ${label}`;
    }).join('\n');

    imageContext = `\n\nReference images available (use @imageN tags in the prompt to reference them):\n${imageDescriptions}\n\nIMPORTANT: Incorporate @imageN tags naturally into the refined prompt to reference the uploaded images. For example: "@image1 walks confidently through a modern office" or "Close-up of @image1 wearing the outfit from @image2".`;
  }

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1_024,
    system: `You are a creative director at a top-tier marketing agency. Your job is to take a raw creative brief and refine it into a precise, production-ready prompt. Be specific about visual details, composition, lighting, color palette, and mood. Never use hype words. Output ONLY the refined prompt — no preamble, no explanation.

When reference images are provided with @imageN tags, you MUST preserve and use those tags in your refined prompt. The tags reference uploaded images that the video model will use for visual consistency.

CHARACTER REFERENCE SHEETS: When the prompt mentions "character sheet", "reference sheet", "turnaround", or "multi-angle", generate a prompt for a character design reference sheet showing the subject from front view, 3/4 view, and side profile on a clean white background with studio lighting. Include exact outfit details, physical features, and expression in every view for consistency.

PRODUCT REFERENCE SHEETS: When the prompt mentions "product sheet", "product reference", or "multi-angle product", generate a prompt for a product design reference showing front, side, back, and detail close-up views on white background with product photography lighting.

85/15 RULE FOR VIDEO: 85% close-up shots, 15% medium max. No long/wide shots. Use action-based descriptions, not camera angles. Include micro-expression parentheticals like "(slight confident smile)" for facial animation quality.`,
    messages: [
      {
        role: 'user',
        content: `Refine this ${context.type} prompt for production use.\n\nRaw prompt: ${rawPrompt}\n${context.style ? `Style: ${context.style}` : ''}${context.tone ? `\nTone: ${context.tone}` : ''}${imageContext}`,
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
