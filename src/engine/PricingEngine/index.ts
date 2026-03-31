// ─── PrinceMarketing.ai Pricing Engine ──────────────────────────────────────
// Every API call must make a profit. This module calculates exact costs,
// applies tier-based markups, and returns margin data for analytics.

import { z } from 'zod';

// ─── Our Costs (what we pay providers) ──────────────────────────────────────

export const COSTS = {
  image: {
    'nano-banana-pro': 0.04,       // per image — Gemini 3 Pro
    'nano-banana-2': 0.01,         // per image — Gemini 3.1 Flash
  },
  video: {
    'seedance-v2.0-omni-reference': 0.30, // per second
    'seedance-v2.0-t2v': 0.25,            // per second
    'seedance-v2.0-i2v': 0.25,            // per second
    'seedance-v2.0-extend': 0.20,         // per second
    'seedance-v2.0-character': 0.30,      // per second
  },
  copy: {
    'claude-sonnet': 0.003,  // per 1K tokens (~$3/MTok input)
    'claude-haiku': 0.001,   // per 1K tokens
  },
  scoring: 0.002, // per score (Claude call)
} as const;

// ─── Markup Multipliers by Tier ─────────────────────────────────────────────

export const MARKUP = {
  starter: 3.5,  // 3.5x markup = ~71% margin
  pro: 2.8,      // 2.8x markup = ~64% margin
  agency: 2.2,   // 2.2x markup = ~55% margin (volume discount)
} as const;

// Minimum markup floor — never let margin go below 2x
const MIN_MARKUP = 2.0;

// ─── Types ──────────────────────────────────────────────────────────────────

export type Tier = keyof typeof MARKUP;
export type ImageModel = keyof typeof COSTS.image;
export type VideoModel = keyof typeof COSTS.video;
export type CopyModel = keyof typeof COSTS.copy;

export type PriceBreakdown = {
  costToUs: number;       // in dollars
  priceToCustomer: number; // in dollars
  margin: number;          // percentage (0-1)
  costCents: number;       // costToUs in cents
  priceCents: number;      // priceToCustomer in cents
};

// ─── Validation Schemas ─────────────────────────────────────────────────────

export const imageModelSchema = z.enum(['nano-banana-pro', 'nano-banana-2']);
export const videoModelSchema = z.enum([
  'seedance-v2.0-omni-reference',
  'seedance-v2.0-t2v',
  'seedance-v2.0-i2v',
  'seedance-v2.0-extend',
  'seedance-v2.0-character',
]);
export const copyModelSchema = z.enum(['claude-sonnet', 'claude-haiku']);
export const tierSchema = z.enum(['starter', 'pro', 'agency']);

// ─── Core Calculation ───────────────────────────────────────────────────────

function calculatePrice(costToUs: number, tier: Tier): PriceBreakdown {
  const markup = Math.max(MARKUP[tier], MIN_MARKUP);
  const priceToCustomer = costToUs * markup;
  const margin = 1 - costToUs / priceToCustomer;

  return {
    costToUs: Math.round(costToUs * 10000) / 10000,
    priceToCustomer: Math.round(priceToCustomer * 10000) / 10000,
    margin: Math.round(margin * 10000) / 10000,
    costCents: Math.round(costToUs * 100),
    priceCents: Math.round(priceToCustomer * 100),
  };
}

// ─── Public Price Calculators ───────────────────────────────────────────────

export function calculateImagePrice(model: ImageModel, tier: Tier): PriceBreakdown {
  const costToUs = COSTS.image[model];
  return calculatePrice(costToUs, tier);
}

export function calculateVideoPrice(
  model: VideoModel,
  durationSeconds: number,
  tier: Tier,
): PriceBreakdown {
  const costPerSecond = COSTS.video[model];
  const costToUs = costPerSecond * durationSeconds;
  return calculatePrice(costToUs, tier);
}

export function calculateCopyPrice(
  tokenCount: number,
  model: CopyModel,
  tier: Tier,
): PriceBreakdown {
  const costPer1K = COSTS.copy[model];
  const costToUs = (tokenCount / 1000) * costPer1K;
  return calculatePrice(costToUs, tier);
}

export function calculateScorePrice(tier: Tier): PriceBreakdown {
  return calculatePrice(COSTS.scoring, tier);
}

// ─── Subscription Plan Definitions ──────────────────────────────────────────

export const PLANS = {
  starter: {
    name: 'Starter',
    priceMonthly: 2900,  // $29/mo in cents
    imageCredits: 100,
    videoCredits: 10,
    copyCredits: 500,
    tier: 'starter' as const,
  },
  pro: {
    name: 'Pro',
    priceMonthly: 14900,  // $149/mo in cents
    imageCredits: 500,
    videoCredits: 50,
    copyCredits: 2000,
    tier: 'pro' as const,
  },
  agency: {
    name: 'Agency',
    priceMonthly: 49900,  // $499/mo in cents
    imageCredits: 2000,
    videoCredits: 200,
    copyCredits: -1, // -1 = unlimited
    tier: 'agency' as const,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ─── Gemini Model Mapping ───────────────────────────────────────────────────
// Maps our internal model names to pricing model names

export function geminiModelToPricingModel(geminiModel: string): ImageModel {
  if (geminiModel === 'gemini-3-pro-image-preview') return 'nano-banana-pro';
  if (geminiModel === 'gemini-3.1-flash-image-preview') return 'nano-banana-2';
  return 'nano-banana-pro'; // default to higher cost for safety
}

export function seedanceModelToPricingModel(seedanceModel: string): VideoModel {
  const model = seedanceModel as VideoModel;
  if (model in COSTS.video) return model;
  return 'seedance-v2.0-omni-reference'; // default to highest cost for safety
}
