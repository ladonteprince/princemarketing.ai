// Pricing configuration — credit allocations per tier and cost tracking
// WHY: Ensures profitability across all subscription tiers.
// Target margins: Starter 55%, Growth 65%, Scale 75%

export type PricingTier = 'starter' | 'growth' | 'scale';

// Monthly subscription prices
export const TIER_PRICES: Record<PricingTier, number> = {
  starter: 29,
  growth: 79,
  scale: 199,
};

// Credit allocations per tier (reset monthly)
export const TIER_CREDITS: Record<PricingTier, {
  imageCredits: number;
  videoCredits: number;
  copyCredits: number;
  audioCredits: number;
  agentCredits: number;
}> = {
  starter: {
    imageCredits: 50,     // ~$0.50-$2.00 cost to us
    videoCredits: 5,      // ~$7.50 cost to us (5 x $1.50)
    copyCredits: 200,     // ~$4.00 cost to us
    audioCredits: 5,      // ~$2.50 cost to us
    agentCredits: 10,     // ~$1.50 cost to us
  },
  growth: {
    imageCredits: 200,    // ~$2.00-$8.00 cost to us
    videoCredits: 25,     // ~$37.50 cost to us
    copyCredits: 1000,    // ~$20.00 cost to us
    audioCredits: 20,     // ~$10.00 cost to us
    agentCredits: 50,     // ~$7.50 cost to us
  },
  scale: {
    imageCredits: 1000,   // ~$10.00-$40.00 cost to us
    videoCredits: 100,    // ~$150.00 cost to us
    copyCredits: 5000,    // ~$100.00 cost to us
    audioCredits: 100,    // ~$50.00 cost to us
    agentCredits: 999999, // Unlimited for Scale
  },
};

// What each credit type costs US (in cents)
export const COST_PER_CREDIT_CENTS: Record<string, number> = {
  // Video (Seedance via MuAPI)
  'video_5s': 150,     // $1.50 per 5s video (15 credits = 10¢/credit)
  'video_10s': 300,    // $3.00 per 10s video
  'video_15s': 450,    // $4.50 per 15s video
  'video_watermark': 0.3, // $0.003 — nearly free

  // Image (Gemini)
  'image_pro': 4,      // $0.04 per pro image
  'image_standard': 1, // $0.01 per standard image

  // Copy (Claude)
  'copy_generate': 2,  // $0.02 per generation
  'copy_refine': 1,    // $0.01 per refinement

  // Audio (Suno via MuAPI)
  'audio_music_30s': 50,  // $0.50
  'audio_sounds_30s': 20, // $0.20
  'audio_sync': 30,       // $0.30

  // Image Processing (MuAPI)
  'process_upscale': 5,
  'process_remove_bg': 3,
  'process_product_shot': 10,

  // AI Agents (Claude + Perplexity)
  'agent_strategy': 15,   // $0.15 Claude
  'agent_content': 5,     // $0.05 Claude
  'agent_analytics': 3,   // $0.03 Claude
  'agent_perplexity': 0.5, // $0.005 per search
};

// Margin analysis per tier (worst-case if customer maxes all credits)
export const MARGIN_ANALYSIS: Record<PricingTier, {
  revenue: number;
  maxCost: number;
  margin: number;
  marginPercent: number;
}> = {
  starter: {
    revenue: 29,
    maxCost: 12.50,  // 50 imgs($1) + 5 vids($7.50) + 200 copy($4) + audio($2.50) + agents($1.50) - reduced from $30
    margin: 16.50,
    marginPercent: 57,
  },
  growth: {
    revenue: 79,
    maxCost: 47.50,  // Images($4) + Videos($37.50) + Copy($10) + Audio($5) + Agents($3.75)
    margin: 31.50,
    marginPercent: 40, // Lower margin but higher volume
  },
  scale: {
    revenue: 199,
    maxCost: 120.00, // Heavy usage estimate
    margin: 79.00,
    marginPercent: 40, // Acceptable for enterprise
  },
};

// Helper: Get credit allocation for a tier
export function getCreditsForTier(tier: string): typeof TIER_CREDITS.starter {
  const t = (tier?.toLowerCase() ?? 'starter') as PricingTier;
  return TIER_CREDITS[t] ?? TIER_CREDITS.starter;
}
