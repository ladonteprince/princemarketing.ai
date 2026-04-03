import type { CriticVerdict, CriticDimensionScore } from './types';
import type { GenerationId, ScoringResultId } from '@/types/ids';
import { createScoringResultId, createGenerationId } from '@/types/ids';
import { QUALITY_THRESHOLDS } from './constants';
import { DIMENSION_DEFINITIONS, type DimensionKey } from './dimensions';
import { computeAggregateScore } from '@/types/scoring';

// ---------------------------------------------------------------------------
// GeminiCritic — Gemini 3.1 Pro multimodal critic for video & image analysis
// Unlike the Claude critic which only sees a URL/text, Gemini actually WATCHES
// the video frame-by-frame, detecting temporal artifacts, flicker, and motion
// issues that a single-frame analysis misses.
// ---------------------------------------------------------------------------

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-3.1-pro-preview';
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-2-preview';

// 20MB inline limit for Gemini — files above this go through the Files API
const MAX_INLINE_BYTES = 20 * 1024 * 1024;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('[GeminiCritic] GEMINI_API_KEY is not set');
  return key;
}

// ---------------------------------------------------------------------------
// 1. Download a file to a Buffer
// ---------------------------------------------------------------------------
async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[GeminiCritic] Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

// ---------------------------------------------------------------------------
// 2. Upload large files through the Gemini Files API
// ---------------------------------------------------------------------------
async function uploadToGeminiFiles(
  buffer: Buffer,
  mimeType: string,
  displayName: string,
): Promise<string> {
  const apiKey = getApiKey();

  // Step 1: Start resumable upload
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(buffer.length),
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: JSON.stringify({
        file: { displayName },
      }),
    },
  );

  const uploadUrl = startRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('[GeminiCritic] Failed to get upload URL from Files API');
  }

  // Step 2: Upload the bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(buffer.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: new Uint8Array(buffer),
  });

  const uploadData = (await uploadRes.json()) as { file?: { uri?: string; name?: string; state?: string } };
  const fileUri = uploadData.file?.uri;
  if (!fileUri) {
    throw new Error(`[GeminiCritic] Files API upload failed: ${JSON.stringify(uploadData)}`);
  }

  // Step 3: Poll until the file is ACTIVE (processing can take a moment)
  const fileName = uploadData.file?.name;
  if (fileName) {
    let state = uploadData.file?.state ?? 'PROCESSING';
    let attempts = 0;
    while (state === 'PROCESSING' && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(
        `${GEMINI_API_URL}/${fileName}?key=${apiKey}`,
      );
      const statusData = (await statusRes.json()) as { state?: string };
      state = statusData.state ?? 'ACTIVE';
      attempts++;
    }
    if (state !== 'ACTIVE') {
      throw new Error(`[GeminiCritic] File ${fileName} stuck in state: ${state}`);
    }
  }

  return fileUri;
}

// ---------------------------------------------------------------------------
// 3. Build the scoring system prompt
// ---------------------------------------------------------------------------
function buildScoringPrompt(type: 'image' | 'video', prompt: string, voiceoverUrl?: string): string {
  const voiceoverNote = voiceoverUrl
    ? '\n\nA voiceover audio track is intended to accompany this video. Consider whether the visual pacing, emotional beats, and scene transitions would sync well with spoken narration.'
    : '';

  return `You are an expert AI content critic for a marketing platform. Analyze this ${type} and score it on these 12 dimensions (each 1-10):

1. Clarity - Is the message/visual clear?
2. Composition - Visual balance, rule of thirds, framing
3. Brand Alignment - Does it match professional marketing standards?
4. Emotional Impact - Does it evoke the intended emotion?
5. Technical Quality - Resolution, sharpness, lighting, noise
6. Originality - Is it distinctive or generic?
7. Message Effectiveness - Would the target audience respond?
8. Visual Hierarchy - Clear focal point and reading order
9. Color Psychology - Do colors support the emotional intent?
10. Typography - Text readability (if any text present)
11. Call-to-Action Strength - Is there a clear CTA? (rate lower if N/A)
12. AI Artifact Detection (WEIGHT: 1.3x) - Look for: malformed hands/faces, temporal flicker between frames, text gibberish, uncanny valley, morphing artifacts

${type === 'video' ? 'Watch the ENTIRE video carefully. Pay close attention to temporal consistency, motion smoothness, and any flickering or morphing between frames. These are common AI video artifacts that single-frame analysis misses.' : ''}

The original prompt was: "${prompt}"${voiceoverNote}

Return your analysis as JSON (no markdown wrapping):
{
  "aggregateScore": number,
  "passed": true,
  "dimensions": [
    {"dimension": "clarity", "score": number, "reasoning": "string"},
    {"dimension": "composition", "score": number, "reasoning": "string"},
    {"dimension": "brandAlignment", "score": number, "reasoning": "string"},
    {"dimension": "emotionalImpact", "score": number, "reasoning": "string"},
    {"dimension": "technicalQuality", "score": number, "reasoning": "string"},
    {"dimension": "originality", "score": number, "reasoning": "string"},
    {"dimension": "messageEffectiveness", "score": number, "reasoning": "string"},
    {"dimension": "visualHierarchy", "score": number, "reasoning": "string"},
    {"dimension": "colorPsychology", "score": number, "reasoning": "string"},
    {"dimension": "typography", "score": number, "reasoning": "string"},
    {"dimension": "ctaStrength", "score": number, "reasoning": "string"},
    {"dimension": "aiArtifactDetection", "score": number, "reasoning": "string"}
  ],
  "feedback": "2-3 sentences of actionable feedback",
  "audioVisualSync": null
}`;
}

// ---------------------------------------------------------------------------
// 4. Call Gemini generateContent with multimodal input
// ---------------------------------------------------------------------------
async function callGemini(parts: Array<Record<string, unknown>>): Promise<string> {
  const apiKey = getApiKey();

  const res = await fetch(
    `${GEMINI_API_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`[GeminiCritic] API error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`[GeminiCritic] No text in response: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return text;
}

// ---------------------------------------------------------------------------
// 5. Parse Gemini's JSON response (handles markdown wrapping)
// ---------------------------------------------------------------------------
function parseGeminiResponse(raw: string): {
  aggregateScore: number;
  dimensions: Array<{ dimension: string; score: number; reasoning: string }>;
  feedback: string;
  audioVisualSync: number | null;
} {
  // Strip markdown code blocks if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned) as {
    aggregateScore?: number;
    dimensions?: Array<{ dimension: string; score: number; reasoning: string }>;
    feedback?: string;
    audioVisualSync?: number | null;
  };

  return {
    aggregateScore: parsed.aggregateScore ?? 0,
    dimensions: parsed.dimensions ?? [],
    feedback: parsed.feedback ?? 'No feedback provided.',
    audioVisualSync: parsed.audioVisualSync ?? null,
  };
}

// ---------------------------------------------------------------------------
// 6. Main entry point: evaluateWithGemini
// ---------------------------------------------------------------------------
export async function evaluateWithGemini(params: {
  generationId: string;
  type: 'image' | 'video';
  prompt: string;
  resultUrl: string;
  qualityTier: 'starter' | 'pro' | 'agency';
  voiceoverUrl?: string;
}): Promise<CriticVerdict> {
  const { generationId, type, prompt, resultUrl, qualityTier, voiceoverUrl } = params;

  console.log(`[GeminiCritic] Scoring ${type} for generation ${generationId}`);

  // 1. Download the media file
  const buffer = await downloadToBuffer(resultUrl);
  const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';

  // 2. Build the parts array for Gemini
  const parts: Array<Record<string, unknown>> = [];

  // Add the media — inline if under 20MB, otherwise upload via Files API
  if (buffer.length <= MAX_INLINE_BYTES) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: buffer.toString('base64'),
      },
    });
  } else {
    console.log(`[GeminiCritic] File is ${(buffer.length / 1024 / 1024).toFixed(1)}MB — uploading via Files API`);
    const fileUri = await uploadToGeminiFiles(buffer, mimeType, `critic-${generationId}`);
    parts.push({
      file_data: {
        mime_type: mimeType,
        file_uri: fileUri,
      },
    });
  }

  // Add the scoring prompt
  parts.push({ text: buildScoringPrompt(type, prompt, voiceoverUrl) });

  // 3. Call Gemini
  const rawResponse = await callGemini(parts);
  const parsed = parseGeminiResponse(rawResponse);

  // 4. Normalize dimensions to match our type system
  const dimensions: ReadonlyArray<CriticDimensionScore> = parsed.dimensions.map((d) => ({
    dimension: d.dimension as DimensionKey,
    score: Math.min(10, Math.max(0, d.score)),
    reasoning: d.reasoning,
  }));

  // 5. Compute the weighted aggregate using our standard function
  const aggregateScore = computeAggregateScore(dimensions);
  const threshold = QUALITY_THRESHOLDS[qualityTier];
  const passed = aggregateScore >= threshold;

  // 6. Score audio-visual sync if voiceover was provided
  let audioVisualSyncScore: number | null = null;
  if (voiceoverUrl && resultUrl) {
    try {
      audioVisualSyncScore = await scoreAudioVisualSync(resultUrl, voiceoverUrl);
      console.log(`[GeminiCritic] Audio-visual sync score: ${audioVisualSyncScore.toFixed(2)}/10`);
    } catch (err) {
      console.error('[GeminiCritic] Audio-visual sync scoring failed:', err);
    }
  }

  console.log(`[GeminiCritic] ${type} scored ${aggregateScore.toFixed(1)}/10 — ${passed ? 'PASSED' : 'FAILED'} (${qualityTier} threshold: ${threshold})`);

  return {
    id: createScoringResultId(crypto.randomUUID()),
    generationId: createGenerationId(generationId),
    dimensions,
    aggregateScore,
    passed,
    qualityTier,
    feedback: audioVisualSyncScore !== null
      ? `${parsed.feedback} [Audio-visual sync: ${audioVisualSyncScore.toFixed(1)}/10]`
      : parsed.feedback,
    scoredAt: new Date(),
  };
}

// Alias for clarity in imports
export const evaluateWithGeminiMultimodal = evaluateWithGemini;

// ---------------------------------------------------------------------------
// Attention Architecture Scoring
// WHY: Scores ANY content (text, scripts, captions, video) against the
// research-backed Attention Architecture framework — 6 Storylocks + 6
// Dopamine Ladder levels. Uses Gemini 3.1 Pro as an independent evaluator
// to eliminate self-evaluation bias (content is generated by Claude).
// For video content, Gemini watches the actual video and evaluates the
// psychological dimensions visually (motion/contrast in first 2s, etc.)
// ---------------------------------------------------------------------------

export type AttentionScoreResult = {
  storylocks: {
    term_branding: number;
    embedded_truths: number;
    thought_narration: number;
    negative_frames: number;
    loop_openers: number;
    contrast_words: number;
  };
  dopamine_ladder: {
    stimulation: boolean;
    captivation: boolean;
    anticipation: boolean;
    validation: boolean;
    loop_reset: boolean;
    revelation_setup: boolean;
  };
  attention_score: number;
  weaknesses: string[];
  suggestions: string[];
  format: string;
};

function buildAttentionScoringPrompt(
  format: string,
  hasMedia: boolean,
): string {
  const mediaNote = hasMedia
    ? `You are watching the actual video/image. Score the VISUAL execution of each dimension — not just the script.
For STIMULATION: Does the opening frame have enough motion and contrast to stop a scroll?
For CAPTIVATION: Does the visual imply a question or create curiosity?
For ANTICIPATION: Do the middle frames build tension through visual foreshadowing?
For VALIDATION: Is there a visible payoff moment (lighting shift, reveal, posture change)?`
    : '';

  return `You are the Attention Architecture Scoring Engine — an independent evaluator that scores content against a research-backed psychological engagement framework.

${mediaNote}

Score the content on these dimensions. Be rigorous — a 10 means flawless execution of that technique.

STORYLOCK SCORES (0-10 each, with reasoning):

1. TERM BRANDING: Does the content coin or use memorable named concepts? A named concept activates categorical long-term memory (Lupyan 2008) and instantly opens an information gap. Score 0 if no named concepts, 5 if generic terms, 10 if distinctive coined terms that are short, memorable, and descriptive.

2. EMBEDDED TRUTHS: Does it use presuppositional language ("when you try this," "once you see," "the reason this works") instead of conditional hedging ("if you try this," "maybe," "might," "could")? Presuppositions bypass epistemic vigilance (Applied Psycholinguistics 2023). Score 0 if all hedging, 5 if mixed, 10 if consistently presuppositional on key claims.

3. THOUGHT NARRATION: Does the content anticipate and voice what the viewer is thinking? ("You're probably wondering..." / "Now you might be thinking this sounds too simple.") The Self-Reference Effect (Rogers et al. 1977) means correctly identified thoughts are encoded more deeply. Score 0 if never addresses viewer thoughts, 10 if proactively anticipates and addresses objections at key moments.

4. NEGATIVE FRAMES: Does it use loss aversion framing for hooks and key points? ("The worst thing you can do is X" > "Here's how to do X well.") Prospect Theory (Kahneman & Tversky 1979): loss pain is ~2x gain pleasure. Score 0 if purely positive framing, 5 if some negative framing, 10 if hooks and pivots use threat activation with positive resolution. Penalize if negative framing is overused (more than 30% of content).

5. LOOP OPENERS: Does the content include attention-resetting transitions? ("But that's not even the most important part.") The vigilance decrement causes predictable attention decline. For ${format}: ${format === 'short-form' ? 'need a loop opener every 20-25 seconds' : format === 'long-form' ? 'need a loop opener every 60-90 seconds' : 'at least 1 loop opener in the body'}. Score 0 if no rehooks, 5 if some transitions, 10 if properly timed loop openers at every attention decay interval.

6. CONTRAST WORDS: Does it use contrastive markers (but, actually, instead, turns out, except, yet) at key claim moments? Rhetorical antithesis triggers micro-scale prediction errors. Score 0 if claims are delivered without contrast, 5 if some contrast, 10 if the hook and each section transition uses [belief A] + [contrastive marker] + [surprising claim B].

DOPAMINE LADDER COVERAGE (true/false each):

1. STIMULATION: Does the opening (first 1-3 seconds for video, first line for text) create bottom-up attentional capture through motion, contrast, brightness, or unexpected salience?
2. CAPTIVATION: Is there an information gap — a genuine unknown quantity that creates curiosity? Not a list promise ("5 tips") but an implied unanswered question.
3. ANTICIPATION: Does the content build prediction without premature resolution? Does it feed confirming details that build toward an answer while delaying the payoff?
4. VALIDATION: Does it deliver a non-obvious payoff that is MORE surprising/interesting than what the viewer predicted? Is the loop actually closed?
5. LOOP RESET: After the payoff, is a NEW information gap opened to sustain engagement?
6. REVELATION SETUP: Does the closing position the content as part of a larger ongoing value system? Does it set up the next piece as a natural continuation?

FORMAT: ${format}

Return ONLY valid JSON (no markdown wrapping):
{
  "storylocks": {
    "term_branding": <0-10>,
    "embedded_truths": <0-10>,
    "thought_narration": <0-10>,
    "negative_frames": <0-10>,
    "loop_openers": <0-10>,
    "contrast_words": <0-10>
  },
  "dopamine_ladder": {
    "stimulation": <true/false>,
    "captivation": <true/false>,
    "anticipation": <true/false>,
    "validation": <true/false>,
    "loop_reset": <true/false>,
    "revelation_setup": <true/false>
  },
  "attention_score": <0-10 weighted average>,
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "suggestions": ["specific actionable fix 1", "specific actionable fix 2"]
}`;
}

/**
 * Score text content (captions, scripts, emails, ad copy) against the
 * Attention Architecture framework using Gemini 3.1 Pro.
 */
export async function scoreAttentionText(
  content: string,
  format: string = 'short-form',
): Promise<AttentionScoreResult> {
  const prompt = buildAttentionScoringPrompt(format, false);

  const parts: Array<Record<string, unknown>> = [
    { text: prompt },
    { text: `\n\nCONTENT TO SCORE:\n\n${content}` },
  ];

  const rawResponse = await callGemini(parts);
  return parseAttentionResponse(rawResponse, format);
}

/**
 * Score video/image content against the Attention Architecture framework.
 * Gemini actually WATCHES the video and evaluates psychological dimensions
 * visually — motion/contrast in the stimulation frame, lighting shifts at
 * validation moments, etc.
 */
export async function scoreAttentionMedia(
  mediaUrl: string,
  type: 'image' | 'video',
  scriptText: string | undefined,
  format: string = 'short-form',
): Promise<AttentionScoreResult> {
  const buffer = await downloadToBuffer(mediaUrl);
  const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';

  const parts: Array<Record<string, unknown>> = [];

  // Add the media
  if (buffer.length <= MAX_INLINE_BYTES) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: buffer.toString('base64'),
      },
    });
  } else {
    const fileUri = await uploadToGeminiFiles(buffer, mimeType, `attn-score-${Date.now()}`);
    parts.push({
      file_data: {
        mime_type: mimeType,
        file_uri: fileUri,
      },
    });
  }

  // Add the scoring prompt + optional script
  const prompt = buildAttentionScoringPrompt(format, true);
  const scriptNote = scriptText
    ? `\n\nACCOMPANYING SCRIPT/CAPTION:\n\n${scriptText}`
    : '';
  parts.push({ text: prompt + scriptNote });

  const rawResponse = await callGemini(parts);
  return parseAttentionResponse(rawResponse, format);
}

function parseAttentionResponse(raw: string, format: string): AttentionScoreResult {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned) as AttentionScoreResult;

  // Clamp all storylock scores to 0-10
  const storylocks = parsed.storylocks ?? {} as AttentionScoreResult['storylocks'];
  for (const key of Object.keys(storylocks) as Array<keyof typeof storylocks>) {
    storylocks[key] = Math.min(10, Math.max(0, storylocks[key] ?? 0));
  }

  return {
    storylocks,
    dopamine_ladder: parsed.dopamine_ladder ?? {
      stimulation: false, captivation: false, anticipation: false,
      validation: false, loop_reset: false, revelation_setup: false,
    },
    attention_score: Math.min(10, Math.max(0, parsed.attention_score ?? 0)),
    weaknesses: parsed.weaknesses ?? [],
    suggestions: parsed.suggestions ?? [],
    format,
  };
}

// ---------------------------------------------------------------------------
// 7. Audio-visual sync scoring via Gemini Embedding 2
// ---------------------------------------------------------------------------
export async function scoreAudioVisualSync(
  videoUrl: string,
  audioUrl: string,
): Promise<number> {
  const apiKey = getApiKey();

  // Download both files
  const [videoBuffer, audioBuffer] = await Promise.all([
    downloadToBuffer(videoUrl),
    downloadToBuffer(audioUrl),
  ]);

  // Determine if we need the Files API for either
  async function getMediaPart(buffer: Buffer, mimeType: string, label: string) {
    if (buffer.length <= MAX_INLINE_BYTES) {
      return {
        inline_data: {
          mime_type: mimeType,
          data: buffer.toString('base64'),
        },
      };
    }
    const uri = await uploadToGeminiFiles(buffer, mimeType, `sync-${label}-${Date.now()}`);
    return {
      file_data: {
        mime_type: mimeType,
        file_uri: uri,
      },
    };
  }

  const videoPart = await getMediaPart(videoBuffer, 'video/mp4', 'video');
  const audioPart = await getMediaPart(audioBuffer, 'audio/mpeg', 'audio');

  // Embed both using Gemini Embedding 2
  async function embedContent(part: Record<string, unknown>): Promise<number[]> {
    const res = await fetch(
      `${GEMINI_API_URL}/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [part] },
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`[GeminiCritic] Embedding error ${res.status}: ${errBody}`);
    }

    const data = (await res.json()) as {
      embedding?: { values?: number[] };
    };

    const values = data.embedding?.values;
    if (!values || values.length === 0) {
      throw new Error('[GeminiCritic] No embedding values returned');
    }

    return values;
  }

  const [videoEmbedding, audioEmbedding] = await Promise.all([
    embedContent(videoPart),
    embedContent(audioPart),
  ]);

  // Compute cosine similarity
  const similarity = cosineSimilarity(videoEmbedding, audioEmbedding);

  // Map from [-1, 1] cosine similarity to [0, 10] score
  // A similarity of 0.5+ is very good for cross-modal embeddings
  const score = Math.min(10, Math.max(0, similarity * 10));

  return score;
}

// ---------------------------------------------------------------------------
// 8. Cosine similarity utility
// ---------------------------------------------------------------------------
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`[GeminiCritic] Embedding dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
