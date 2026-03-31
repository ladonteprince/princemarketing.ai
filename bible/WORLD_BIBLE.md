# PrinceMarketing.ai -- World Bible
### The AI Creative Production Engine

**Version:** 1.0  
**Date:** 2026-03-31  
**Status:** LOCKED  
**Owner:** LaDonte Prince  
**Relationship:** Engine powering PrinceMarketing.com; also standalone developer product

> This document is the single source of truth for all PrinceMarketing.ai brand, product, and creative decisions. Every API response, documentation page, marketing asset, and developer interaction derives from this Bible. Nothing ships without alignment to this document.

---

## Table of Contents

1. [Brand Archetype & Identity](#1-brand-archetype--identity)
2. [Visual Language & Color System](#2-visual-language--color-system)
3. [Typography](#3-typography)
4. [Brand Voice & Tone Guidelines](#4-brand-voice--tone-guidelines)
5. [Audience Personas](#5-audience-personas)
6. [API Product Principles](#6-api-product-principles)
7. [Developer Experience Principles](#7-developer-experience-principles)
8. [Naming Conventions](#8-naming-conventions)
9. [Production Pipeline Architecture](#9-production-pipeline-architecture)
10. [Competitive Positioning](#10-competitive-positioning)
11. [Brand Relationship: .ai to .com](#11-brand-relationship-ai-to-com)
12. [Critic Scoring Categories](#12-critic-scoring-categories)
13. [Production-Ready Checklist](#13-production-ready-checklist)

---

## 1. Brand Archetype & Identity

### The Archetype: The Forge King

**One-sentence definition:** The invisible master craftsman whose work you recognize by its unmistakable quality -- never by his face.

The Forge King is the archetype of the engine room, the foundry, the workshop where raw materials become finished weapons. PrinceMarketing.ai does not seek attention. It seeks perfection. The .com platform takes the stage; the .ai platform builds the stage, the lights, the costumes, and the script.

### Two Modes

| Mode | Name | When It Activates | Feeling |
|------|------|-------------------|---------|
| **Mode 1** | The Architect | API design, documentation, system architecture, developer onboarding | Precision. Calm authority. Every parameter has a reason. |
| **Mode 2** | The Furnace | Asset generation, batch processing, quality loops, creative output | Raw power. Heat. Speed with no compromise on craft. |

### The Medusa Effect
The moment a developer sends their first API call and gets back a marketing asset that looks like a $50,000 agency produced it -- in 4 seconds. The quality gap between expectation and delivery creates a cognitive lock. They cannot go back to manual production.

### The Limerence Trigger
The feedback loop. Every asset comes with a quality score. The developer sees the Critic agent's reasoning. They understand WHY it scored a 9.2. They start chasing 9.5. Then 9.8. The scoring system creates an addictive pursuit of perfection that keeps them generating, refining, generating.

### Emotional Effect on Audience
- Developers feel: "I have a superpower now."
- Agencies feel: "We just 10x'd our capacity without hiring."
- The .com platform feels: "The engine never fails me."

### Cultural Reference Points
- Stripe's API (the gold standard of developer experience)
- Vercel's dashboard (dark, fast, beautiful, functional)
- Runway's creative ambition (AI as creative tool, not toy)
- Dieter Rams' design philosophy (less but better)
- The Batcave (powerful tools, hidden from the world, serving a public mission)

---

## 2. Visual Language & Color System

### Design Philosophy
Dark-first. Monospace accents. The aesthetic of a high-end terminal meets a film production studio's color grading suite. Every pixel communicates: "serious tools for serious work."

### Primary Color Palette

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| **Background Primary** | Void | `#0A0A0F` | 10, 10, 15 | Page backgrounds, app shell |
| **Background Secondary** | Graphite | `#12121A` | 18, 18, 26 | Cards, panels, elevated surfaces |
| **Background Tertiary** | Slate | `#1A1A2E` | 26, 26, 46 | Hover states, active panels |
| **Accent Primary** | Forge Blue | `#0EA5E9` | 14, 165, 233 | Primary actions, links, brand mark (shared DNA with .com) |
| **Accent Secondary** | Arc Light | `#38BDF8` | 56, 189, 248 | Highlights, focus rings, code syntax |
| **Accent Tertiary** | Ember | `#F59E0B` | 245, 158, 11 | Warnings, credit usage, generation status |
| **Signal: Success** | Mint | `#10B981` | 16, 185, 129 | Success states, quality scores 8+ |
| **Signal: Error** | Flare | `#EF4444` | 239, 68, 68 | Errors, failed generations, scores below threshold |
| **Signal: Info** | Amethyst | `#8B5CF6` | 139, 92, 246 | Information, tips, documentation callouts |

### Extended Palette: Generation Status

| State | Color | Hex | Usage |
|-------|-------|-----|-------|
| Queued | Slate | `#64748B` | Job waiting in queue |
| Processing | Arc Light pulse | `#38BDF8` at 60% opacity, animated | Active generation |
| Scoring | Ember | `#F59E0B` | Critic agent evaluating |
| Passed | Mint | `#10B981` | Score meets threshold |
| Failed/Regenerating | Flare | `#EF4444` | Below threshold, re-entering pipeline |
| Delivered | Forge Blue | `#0EA5E9` | Final asset ready |

### Color Temperature by Context

| Context | Kelvin | Mood |
|---------|--------|------|
| Documentation pages | 6500K | Clean, neutral, readable |
| Dashboard / API console | 5000K | Warm-neutral, focused work environment |
| Generation in progress | 3500K | Furnace warmth, creative heat |
| Error states | 7500K | Cool, clinical, alert |

### Texture & Material Language
- **Surfaces:** Matte dark with subtle noise texture (2% opacity grain on backgrounds)
- **Borders:** 1px `rgba(255, 255, 255, 0.06)` -- barely visible, felt more than seen
- **Shadows:** Inner shadows preferred over drop shadows. Inset depth, not floating
- **Glass:** Frosted glass (backdrop-blur: 12px) for overlays and modals only
- **Code blocks:** `#0D1117` background (GitHub dark reference) with syntax highlighting

### Lighting Design (for marketing assets and hero imagery)
- **Key light:** Cool top-down, 6500K, hard edge -- like a server room's overhead fluorescent
- **Fill:** Forge Blue ambient glow from screens/interfaces, 15% intensity
- **Accent:** Single Ember highlight on the product/API response being showcased
- **Signature setup:** "The Terminal Glow" -- a dark room lit only by the blue-white of a monitor displaying an API response, with the Ember accent on the quality score

---

## 3. Typography

### Font Stack

| Role | Font | Fallback | Weight | Usage |
|------|------|----------|--------|-------|
| **Display / Headlines** | JetBrains Mono | Fira Code, Consolas, monospace | 700 (Bold) | Hero titles, section headers, the `.ai` in the logo |
| **Body** | Inter | system-ui, -apple-system, sans-serif | 400 (Regular), 500 (Medium) | Documentation text, UI labels, descriptions |
| **Code / Technical** | JetBrains Mono | Fira Code, monospace | 400 (Regular) | Code samples, API endpoints, parameters, terminal output |
| **Data / Numbers** | JetBrains Mono | Tabular nums, monospace | 500 (Medium) | Scores, metrics, credit counts, timestamps |

### Type Scale

| Level | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| Hero | 3.5rem (56px) | 1.1 | 700 | Landing page hero only |
| H1 | 2.25rem (36px) | 1.2 | 700 | Page titles |
| H2 | 1.5rem (24px) | 1.3 | 600 | Section headers |
| H3 | 1.25rem (20px) | 1.4 | 600 | Subsection headers |
| Body Large | 1.125rem (18px) | 1.6 | 400 | Lead paragraphs, introductions |
| Body | 1rem (16px) | 1.6 | 400 | Default text |
| Small | 0.875rem (14px) | 1.5 | 400 | Helper text, captions, metadata |
| Code | 0.875rem (14px) | 1.7 | 400 | Inline code, code blocks |
| Micro | 0.75rem (12px) | 1.4 | 500 | Badges, tags, status labels |

### Name Treatment: The Logo

**Primary mark:** `PrinceMarketing` in Inter Bold + `.ai` in JetBrains Mono Bold

The `.ai` is always rendered in the monospace font to signal "this is the technical layer." The period is intentional and always included.

**Lockup rules:**
- `PrinceMarketing` = Inter Bold 700, `#FFFFFF`
- `.ai` = JetBrains Mono Bold 700, `#0EA5E9` (Forge Blue)
- The `.ai` sits at the same baseline but its monospace character creates a subtle visual break
- Minimum size: 140px width digital, 1.2 inches print
- Clear space: 24px all sides minimum

**Alternate forms:**
- Monochrome white: Both parts `#FFFFFF` (for dark photo backgrounds)
- Monochrome blue: Both parts `#0EA5E9` (for light backgrounds -- rare usage)
- Icon mark: `P.ai` -- JetBrains Mono Bold, Forge Blue, for favicons and small contexts
- Terminal mark: `$ princemarketing` -- full monospace, used in CLI contexts and developer docs

---

## 4. Brand Voice & Tone Guidelines

### The Voice: Precise Authority

PrinceMarketing.ai speaks like a senior engineer who is also an exceptional writer. Every sentence earns its place. No filler. No hype. No exclamation marks in documentation.

### Voice Characteristics

| Characteristic | What It Means | Example |
|---------------|---------------|---------|
| **Direct** | Lead with the information. No throat-clearing. | "Generate an image. Get a quality score. Decide if it ships." NOT "We're excited to offer you the ability to..." |
| **Technical but clear** | Use precise terminology. Define it once. Never dumb it down, never gatekeep. | "The Critic agent evaluates outputs against 12 scoring dimensions. Each dimension is weighted 1-10." |
| **Confident without arrogance** | State capabilities as facts, not boasts. | "Batch generation processes 500 assets in under 3 minutes." NOT "Our incredibly powerful engine..." |
| **Respect for the developer's time** | Every paragraph must answer: why should they keep reading? | Code examples before explanations. Show, then tell. |
| **Dry wit permitted** | Occasional understated humor in docs and error messages. Never forced. | 404 page: "This endpoint doesn't exist yet. But you could build it." |

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| **API Documentation** | Calm, factual, scannable. Paragraphs under 3 sentences. Code first. | "POST /v1/generate/image\n\nGenerates a marketing image from a text prompt. Returns a URL and quality score." |
| **Error Messages** | Helpful, specific, actionable. Never blame the developer. | "Invalid aspect_ratio. Expected one of: 16:9, 9:16, 1:1. Got: 2:3." NOT "Bad request." |
| **Changelog / Release Notes** | Matter-of-fact. What changed, why, what to do. | "v2.4.0: Critic agent now scores motion quality separately from visual artifacts. Existing integrations unaffected." |
| **Marketing / Landing Page** | More energy permitted. Still grounded in specifics. Show the output, not the promise. | "One API call. Agency-grade creative. Quality-scored before you see it." |
| **Onboarding Emails** | Warm but efficient. Respect the inbox. | "Your API key is active. Here's a curl command that generates your first image in 4 seconds." |
| **Blog / Technical Writing** | Thoughtful, opinionated, well-structured. Long-form is fine if dense with value. | Deep dives into how the Critic agent works, prompt engineering patterns, pipeline architecture. |

### Words We Use

| Use | Because |
|-----|---------|
| generate | Accurate. The API generates assets. |
| score | The quality system scores outputs. |
| pipeline | The production flow is a pipeline. |
| asset | Generic term for any generated output. |
| engine | PrinceMarketing.ai is an engine. |
| threshold | Quality scores have thresholds. |
| ship | Assets ship to production when they pass. |

### Words We Avoid

| Avoid | Because | Use Instead |
|-------|---------|-------------|
| revolutionary | Hype word. Empty. | (state the capability) |
| leverage | Corporate jargon. | use |
| utilize | Same. | use |
| empower | Overused. Meaningless. | enable |
| seamless | Nothing is seamless. | reliable, fast |
| cutting-edge | Every AI company says this. | (describe the tech) |
| synergy | No. | integration |
| disrupt | 2015 called. | (describe what's different) |

---

## 5. Audience Personas

### Persona 1: "The Platform" (PrinceMarketing.com)

**Who:** The SaaS dashboard itself -- the primary API consumer. Every feature on .com calls .ai APIs behind the scenes.

**Technical profile:**
- Internal service-to-service communication
- Highest volume consumer (90%+ of all API calls)
- Needs: sub-second latency, batch operations, webhook callbacks, deterministic quality thresholds
- Authentication: service account with elevated rate limits

**What they need from the API:**
- Rock-solid uptime (99.9%+)
- Predictable response schemas (no surprises between versions)
- Async job management for video generation (Veo 3.1 renders take time)
- Quality scoring that matches the .com UI's "confidence" display
- Batch endpoints for multi-asset generation (brand packages)

**What they fear:**
- Breaking schema changes
- Latency spikes during peak hours
- Quality inconsistency between identical prompts
- Silent failures (generation completes but output is garbage)

**How we serve them:**
- Versioned API with minimum 12-month deprecation windows
- Webhook delivery with retry logic
- Idempotency keys on all generation endpoints
- Quality scores on every response -- no silent garbage

---

### Persona 2: "The Builder" (Indie Developer)

**Who:** A solo developer or small team building a product that needs AI-generated marketing content. Could be a Shopify app, a social media tool, a content platform. They chose to build with APIs rather than use a SaaS dashboard.

**Technical profile:**
- 1-3 developers
- Using TypeScript/Python/Go
- Comfortable with REST APIs, less so with complex orchestration
- Budget-conscious: watching credit usage closely
- Ships fast, iterates faster

**What they need from the API:**
- Fastest possible time-to-first-asset (under 5 minutes from signup to generated image)
- Simple, predictable pricing per API call
- SDKs in their language (TypeScript and Python minimum)
- Copy-paste code examples that actually work
- Clear rate limits and usage dashboards

**What they fear:**
- Opaque pricing (surprise bills)
- Poor documentation (the kind where you have to guess the parameters)
- Vendor lock-in (proprietary formats, no export)
- Inconsistent quality (sometimes great, sometimes unusable)

**How we serve them:**
- Interactive API playground in docs (try before you code)
- Free tier with 100 generations/month (enough to build and test)
- Every code example tested and runnable
- Plain-English error messages with fix suggestions
- Usage dashboard with real-time credit tracking

---

### Persona 3: "The Machine" (Agency)

**Who:** A marketing or creative agency that needs to generate content at scale for multiple clients. They have developers but their stakeholders are account managers and creative directors who judge output quality, not code quality.

**Technical profile:**
- 5-20 person dev team within a larger agency
- Integrating into existing CMS/DAM/project management systems
- Need multi-tenant support (generate for Client A, bill to Client A)
- Volume: thousands of assets per month
- Quality bar: agency-level output or their clients complain

**What they need from the API:**
- Multi-workspace / sub-account architecture
- Style consistency across batches (same campaign = same look)
- Approval workflows (generate, review, approve, deliver)
- White-label capability (output has no PrinceMarketing branding)
- Bulk pricing that makes financial sense vs. hiring designers

**What they fear:**
- Output that looks "AI-generated" (the uncanny valley of marketing)
- Inconsistency between assets in the same campaign
- No audit trail (which prompt generated which asset)
- Client data leaking between workspaces

**How we serve them:**
- Style locks: save a style configuration, apply to all future generations
- Full generation audit log (prompt, parameters, score, output URL, timestamp)
- Workspace isolation with separate API keys per client
- Enterprise SLA with dedicated support channel
- Quality threshold defaults set higher for agency tier (8.5/10 minimum)

---

## 6. API Product Principles

### What the API Always Does

1. **Returns a quality score with every generated asset.** No exceptions. Every image, video, copy block, and brand package includes a `quality_score` object with an overall score (0.0-10.0) and per-dimension breakdowns.

2. **Fails loudly and specifically.** Every error response includes: HTTP status code, machine-readable error code, human-readable message, and a `suggestion` field with how to fix it.

3. **Respects idempotency.** Every mutating endpoint accepts an `Idempotency-Key` header. Retries with the same key return the same response. No duplicate charges.

4. **Versions explicitly.** URL-based versioning (`/v1/`, `/v2/`). No silent breaking changes. Deprecation notices minimum 12 months before removal.

5. **Provides deterministic output when asked.** A `seed` parameter on all generation endpoints. Same seed + same parameters = same output. Essential for testing and reproducibility.

6. **Includes generation metadata.** Every response includes `meta.generation_time_ms`, `meta.model_used`, `meta.credits_consumed`, and `meta.pipeline_version`.

7. **Delivers assets in standard formats.** Images: PNG, JPEG, WebP. Video: MP4 (H.264). Copy: plain text and structured JSON. No proprietary formats.

8. **Enforces quality thresholds by default.** If a generation scores below the tier's quality threshold, the pipeline automatically regenerates (up to 3 attempts) before returning. The developer gets the best attempt. They can override this with `auto_regenerate: false`.

### What the API Never Does

1. **Never trains on customer data.** Generated assets, prompts, and uploaded references are never used to train models. Period. This is contractual, not just policy.

2. **Never returns without a quality score.** Even if scoring fails, the response includes `quality_score: null` with an explanation -- never silently omitted.

3. **Never changes response schemas within a version.** New fields may be added (additive changes). Existing fields are never removed, renamed, or retyped within a version.

4. **Never bills for failed generations.** If the pipeline fails and returns an error, zero credits are consumed. If the auto-regeneration loop exhausts all attempts and still fails, zero credits consumed.

5. **Never exposes one customer's data to another.** Workspace isolation is enforced at the infrastructure level, not just application level.

6. **Never applies watermarks or branding to generated assets.** Output belongs to the customer. No "Made with PrinceMarketing" watermarks. Ever.

7. **Never rate-limits without warning.** Rate limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included on every response. 429 responses include `Retry-After`.

8. **Never deprecates without migration path.** Every deprecation notice includes: what's changing, why, what to use instead, and a code example of the migration.

---

## 7. Developer Experience Principles

### The 4-Second Rule
A developer should be able to go from "I just got my API key" to "I'm looking at a generated marketing image" in under 4 seconds of actual API time. The onboarding flow is measured against this.

### The Copy-Paste Promise
Every code example in documentation is:
- Complete (no "..." or "// rest of your code here")
- Tested against the live API in CI
- Available in TypeScript, Python, and curl
- Runnable with zero modification except inserting the API key

### The Documentation Hierarchy
Every endpoint's documentation follows this exact structure:

```
1. One-sentence description
2. Endpoint and method
3. Complete code example (before parameters)
4. Response example
5. Parameters table
6. Error codes
7. Related endpoints
```

Code comes BEFORE the parameter table. Developers scan code first, read docs second.

### SDK Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Typed everything** | Full TypeScript types, Python type hints, Go structs |
| **Zero config default** | `new PrinceMarketing(apiKey)` works. Everything else is optional. |
| **Async-first** | All generation methods return promises/futures. Sync wrappers available but not default. |
| **Predictable errors** | Custom error classes: `RateLimitError`, `QualityThresholdError`, `InvalidParameterError` |
| **Pagination consistent** | Cursor-based pagination on all list endpoints. Same pattern everywhere. |
| **Webhook-native** | SDK includes webhook signature verification helper out of the box. |

### API Playground
- Embedded in docs (not a separate app)
- Pre-filled with working examples
- Shows real-time credit cost before execution
- Displays both the request and the raw response
- Shareable playground links (for bug reports and support)

### Status and Transparency
- Public status page at `status.princemarketing.ai`
- Real-time generation pipeline status (queue depth, average latency)
- Incident communication within 15 minutes of detection
- Post-mortems published for any downtime > 5 minutes

---

## 8. Naming Conventions

### API Endpoints

**Base URL:** `https://api.princemarketing.ai/v1`

**Pattern:** `/{resource}/{action}` -- RESTful with action verbs for generation endpoints.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/generate/image` | POST | Generate a marketing image |
| `/v1/generate/video` | POST | Generate a marketing video (Veo 3.1) |
| `/v1/generate/copy` | POST | Generate ad copy (multiple formats) |
| `/v1/generate/brand-package` | POST | Generate a complete brand asset set |
| `/v1/generate/batch` | POST | Batch generation (mixed asset types) |
| `/v1/score` | POST | Score an existing asset (without generating) |
| `/v1/jobs/{job_id}` | GET | Check async job status |
| `/v1/jobs/{job_id}/result` | GET | Retrieve completed job output |
| `/v1/styles` | GET/POST | List or create reusable style configurations |
| `/v1/styles/{style_id}` | GET/PUT/DELETE | Manage a specific style |
| `/v1/usage` | GET | Current billing period usage |
| `/v1/webhooks` | GET/POST | Manage webhook subscriptions |

### Parameter Naming

| Convention | Example | Rationale |
|-----------|---------|-----------|
| snake_case for all parameters | `aspect_ratio`, `quality_threshold`, `auto_regenerate` | Industry standard for REST APIs |
| Boolean parameters are positive | `auto_regenerate: true` not `skip_regeneration: false` | Reduces cognitive load |
| Enum values are lowercase | `format: "png"`, `style: "modern"` | Consistent, grep-friendly |
| Nested objects use dot notation in docs | `options.quality_threshold` | Clear hierarchy |

### Response Field Naming

```json
{
  "id": "gen_abc123",
  "object": "generation",
  "status": "completed",
  "created_at": "2026-03-31T12:00:00Z",
  "asset": {
    "url": "https://cdn.princemarketing.ai/...",
    "format": "png",
    "width": 1080,
    "height": 1080
  },
  "quality_score": {
    "overall": 9.2,
    "dimensions": {
      "composition": 9.5,
      "brand_alignment": 8.8,
      "visual_clarity": 9.3,
      "color_harmony": 9.1,
      "text_legibility": 9.4
    }
  },
  "meta": {
    "generation_time_ms": 3847,
    "model_used": "nano-banana-pro-v2",
    "credits_consumed": 1,
    "pipeline_version": "2.4.0",
    "regeneration_count": 0
  }
}
```

### ID Prefixes

| Resource | Prefix | Example |
|----------|--------|---------|
| Generation | `gen_` | `gen_abc123xyz` |
| Job | `job_` | `job_def456uvw` |
| Style | `sty_` | `sty_ghi789rst` |
| Workspace | `ws_` | `ws_jkl012opq` |
| API Key | `pk_live_` / `pk_test_` | `pk_live_mno345` |
| Webhook | `whk_` | `whk_pqr678` |
| Event | `evt_` | `evt_stu901` |

### Feature Naming (Internal Pipeline Phases)

The production pipeline phases use film terminology internally. These map to API capabilities:

| Pipeline Phase | Internal Name | API Surface |
|---------------|---------------|-------------|
| Bible | Brand Foundation | `/v1/styles` (style creation from brand brief) |
| Cast | Character Registry | `/v1/generate/brand-package` (persona creation) |
| Wardrobe | Visual Style | `/v1/styles` (visual configuration) |
| Shoot | Principal Photography | `/v1/generate/image`, `/v1/generate/video` |
| Dialogue | Copy Production | `/v1/generate/copy` |
| Edit | Post-Production | `/v1/generate/batch` (with refinement passes) |
| Critic | Quality Scoring | `/v1/score`, `quality_score` in all responses |
| Title | Naming Engine | `/v1/generate/copy` with `format: "headline"` |
| Limerence | Engagement Optimization | Scoring dimension, not a separate endpoint |

### Documentation Structure

```
docs.princemarketing.ai/
  /quickstart              -- 4-second first generation
  /authentication          -- API keys and auth
  /generation
    /images                -- Image generation endpoint
    /videos                -- Video generation (Veo 3.1)
    /copy                  -- Ad copy generation
    /brand-packages        -- Brand asset bundles
    /batch                 -- Batch operations
  /quality
    /scoring               -- How quality scoring works
    /thresholds            -- Setting quality minimums
    /critic                -- The Critic agent explained
  /styles                  -- Style configurations
  /jobs                    -- Async job management
  /webhooks                -- Event subscriptions
  /sdks
    /typescript            -- TypeScript SDK
    /python                -- Python SDK
  /pricing                 -- Credits and tiers
  /changelog               -- Version history
  /status                  -- System status
```

---

## 9. Production Pipeline Architecture

### The Agent Swarm

PrinceMarketing.ai runs multiple AI agents in parallel, coordinated by an orchestrator. This is the core technical advantage.

```
Request arrives
    |
    v
[Orchestrator Agent]
    |
    +---> [Copy Agent] ---------> ad headlines, body text, CTAs
    |         (parallel)
    +---> [Image Agent] --------> marketing images via Nano Banana Pro
    |         (parallel)
    +---> [Video Agent] --------> video content via Veo 3.1
    |         (parallel)
    +---> [Brand Agent] --------> logos, color palettes, style guides
    |
    v
[All outputs arrive]
    |
    v
[Critic Agent] -- scores every output against 12 dimensions
    |
    +---> Score >= threshold? --> DELIVER to caller
    |
    +---> Score < threshold? --> REGENERATE with Critic feedback
              (up to 3 loops)
              |
              v
          [Return best attempt with score + reasoning]
```

### Video Generation: Veo 3.1 Exclusive

ALL video generation uses Veo 3.1. No engine routing. No fallbacks to other models.

| Capability | Veo 3.1 Tool | Parameters |
|-----------|-------------|------------|
| Text to video | `veo_text_to_video` | prompt, aspect_ratio, resolution, duration (4-8s) |
| Image to video | `veo_image_to_video` | image + prompt, animates the starting frame |
| Frame interpolation | `veo_interpolate` | first_frame + last_frame + prompt, creates transition |
| Character consistency | `veo_reference_images` | up to 3 reference images for subject preservation |
| Video extension | `veo_extend` | extends existing Veo video by ~7s, up to 20x (148s max) |

### Quality Feedback Loop

```
Generate asset
    |
    v
Critic scores on 12 dimensions (1.0 - 10.0 each)
    |
    v
Calculate weighted overall score
    |
    +---> >= threshold (default 8.0) --> PASS, deliver
    |
    +---> < threshold, attempt < 3 --> REGENERATE
    |         Critic provides specific feedback:
    |         "Composition score 6.2: subject too centered,
    |          negative space unbalanced on right third"
    |         Feedback injected into regeneration prompt
    |
    +---> < threshold, attempt = 3 --> DELIVER BEST
              Return highest-scoring attempt
              Include all scores and reasoning
              Flag: "below_threshold": true
```

### Production Pipeline Map

| Bible Element | Execution Tool | API Endpoint |
|---------------|---------------|-------------|
| Brand brief to style config | Gemini 2.5 Pro | POST `/v1/styles` |
| Character/persona descriptions | Nano Banana Pro (keyframes) | POST `/v1/generate/image` |
| Visual style references | Browser Use Cloud API + NB Pro | POST `/v1/generate/brand-package` |
| Ad copy (all formats) | Gemini 2.5 Pro | POST `/v1/generate/copy` |
| Marketing images | Nano Banana Pro v2 | POST `/v1/generate/image` |
| Marketing videos | Veo 3.1 (exclusive) | POST `/v1/generate/video` |
| Quality evaluation | Gemini Critic Agent | POST `/v1/score` (explicit) or auto |
| Color grading specs | ffmpeg colorbalance | Internal pipeline step |
| Batch assembly | Gemini Editor Agent | POST `/v1/generate/batch` |

---

## 10. Competitive Positioning

### The Landscape

| Competitor | What They Do | Their Strength | Their Weakness | Our Differentiator |
|-----------|-------------|---------------|----------------|-------------------|
| **Jasper API** | AI copy generation | Strong copywriting, large template library | Text only. No images. No video. No quality scoring. | Full-stack creative: copy + image + video + scoring in one API |
| **Copy.ai API** | AI copy workflows | Good workflow automation, multi-step copy | Text only. Workflow complexity is high. No visual assets. | Single API call generates complete marketing packages |
| **Canva API** | Template-based design | Massive template library, familiar to non-devs | Template-constrained. Not truly generative. Limited API surface. | True generation, not template fill. Every output is unique. |
| **Runway API** | AI video generation | Strong video models, creative community | Video only. No copy. No images. No quality scoring. Enterprise pricing. | Full pipeline with quality guarantee. Priced for indie devs too. |
| **OpenAI DALL-E API** | Image generation | Brand recognition, easy to start | General purpose, not marketing-optimized. No quality scoring. No video. | Marketing-specific generation with built-in quality critic |
| **Stability AI API** | Image generation | Open-source models, fine-tuning | Complex. Requires ML knowledge. Not marketing-focused. | Marketing-first. No ML knowledge required. |

### Positioning Statement

**For developers who need marketing-quality creative assets from an API**, PrinceMarketing.ai is the **AI creative production engine** that generates, scores, and delivers images, video, and copy in a single platform. Unlike point solutions that only do text OR images OR video, PrinceMarketing.ai runs the full production pipeline -- from brief to quality-scored deliverable -- so developers never have to stitch together five different APIs and build their own quality layer.

### The Three Pillars of Differentiation

1. **Full-Stack Creative.** One API for copy, images, video, and brand packages. No Frankenstein integrations.

2. **Quality-Scored by Default.** Every output includes a Critic agent's quality assessment. Developers know what they're shipping before they ship it. No other creative API does this.

3. **Production Pipeline, Not Point Tool.** The internal agent swarm runs the same workflow a creative agency would: brief, generate, critique, refine, deliver. The developer gets the finished product, not a raw first draft.

---

## 11. Brand Relationship: .ai to .com

### The Shared DNA

PrinceMarketing.ai and PrinceMarketing.com are two expressions of the same organism.

| Attribute | .com (The Dashboard) | .ai (The Engine) |
|-----------|---------------------|-----------------|
| **Primary audience** | Solo business owners, marketers | Developers, agencies, the .com platform itself |
| **Visual mode** | Light-first, friendly, blue | Dark-first, technical, blue + monospace |
| **Brand color** | `#0EA5E9` (Primary Blue) | `#0EA5E9` (Forge Blue) -- same hex, different name |
| **Typography** | Inter (all contexts) | Inter (body) + JetBrains Mono (code/display) |
| **Background** | White `#FFFFFF` | Void `#0A0A0F` |
| **Voice** | Friendly, encouraging, accessible | Direct, precise, technical-but-clear |
| **Emotional register** | "We help you succeed" | "Here are the tools. Build." |
| **Error tone** | "Oops! Let's try that again." | "Invalid parameter. Expected string, got number." |
| **Logo treatment** | `Prince Marketing` -- Inter Bold, blue | `PrinceMarketing.ai` -- Inter Bold + Mono, blue accent |

### How They Complement

```
[Solo business owner visits PrinceMarketing.com]
        |
        v
  Friendly onboarding, guided experience
  "What kind of business do you have?"
        |
        v
  [.com dashboard calls .ai APIs behind the scenes]
        |
        v
  [.ai generates, scores, regenerates if needed]
        |
        v
  [.com displays finished assets with confidence badge]
  "Here's your Facebook ad! Confidence: 92%"
```

The .com user never sees the .ai layer. They see friendly language and a confidence percentage. Under the hood, that confidence percentage IS the Critic agent's quality score, translated from developer language ("9.2/10 overall, composition: 9.5") into user language ("92% confidence").

### The Handoff Points

| When a .com user needs... | .com calls this .ai endpoint | .com displays it as... |
|--------------------------|----------------------------|----------------------|
| A social media ad image | `POST /v1/generate/image` | "Your ad is ready!" + confidence badge |
| Ad copy variations | `POST /v1/generate/copy` | 3 copy options with "Best pick" highlight |
| A video ad | `POST /v1/generate/video` | Progress bar + "Rendering your video..." |
| A brand package | `POST /v1/generate/brand-package` | Step-by-step brand builder wizard |
| Quality check on their upload | `POST /v1/score` | "How strong is this ad?" analysis |

### Brand Rules for Co-Existence

1. **The .com site never references the API.** Regular users don't need to know an API exists.
2. **The .ai site acknowledges the .com.** "PrinceMarketing.ai powers PrinceMarketing.com and is also available directly for developers."
3. **Shared blue, divergent contexts.** Both use `#0EA5E9` but in opposite contexts (blue on white vs. blue on black).
4. **Never cross the voices.** .com never uses developer jargon. .ai never uses encouraging/emotional language in docs.
5. **One billing system.** API credits purchased on .ai work on .com and vice versa. Same account, same wallet.

---

## 12. Critic Scoring Categories

The Critic agent evaluates every generated asset against these dimensions. Each scored 1.0 to 10.0.

### Universal Dimensions (all asset types)

| # | Dimension | What It Measures | Weight |
|---|-----------|-----------------|--------|
| 1 | **Brand Alignment** | Does the output match the style configuration / brand brief? | 1.2x |
| 2 | **Visual Clarity** | Is the output clean, readable, free of artifacts? | 1.1x |
| 3 | **Composition** | Rule of thirds, balance, negative space, visual hierarchy | 1.0x |
| 4 | **Color Harmony** | Do colors work together? Match the palette? Evoke the right mood? | 1.0x |
| 5 | **Production Value** | Does this look professional? Would it pass for agency work? | 1.2x |
| 6 | **AI Artifact Detection** | Distorted hands, melted text, impossible geometry, uncanny valley | 1.3x (highest weight) |

### Image-Specific Dimensions

| # | Dimension | What It Measures |
|---|-----------|-----------------|
| 7 | **Text Legibility** | If text is present, is it readable, spelled correctly, well-placed? |
| 8 | **Subject Focus** | Is the main subject clear and commanding attention? |

### Video-Specific Dimensions

| # | Dimension | What It Measures |
|---|-----------|-----------------|
| 7 | **Motion Quality** | Smooth, natural motion? No jitter, warping, or temporal artifacts? |
| 8 | **Audio-Visual Sync** | Does the audio (if present) match the visuals? |
| 9 | **Temporal Consistency** | Does the subject maintain identity across frames? |

### Copy-Specific Dimensions

| # | Dimension | What It Measures |
|---|-----------|-----------------|
| 7 | **Persuasion Power** | Does the copy drive action? Clear CTA? Benefit-focused? |
| 8 | **Tone Accuracy** | Does it match the requested tone/brand voice? |
| 9 | **Grammar & Fluency** | Clean, error-free, natural-sounding? |

### Brand Package Dimensions

| # | Dimension | What It Measures |
|---|-----------|-----------------|
| 7 | **Internal Consistency** | Do all assets in the package look like they belong together? |
| 8 | **Versatility** | Will these assets work across required platforms/sizes? |

### Scoring Thresholds by Tier

| Tier | Default Threshold | Auto-Regeneration | Max Attempts |
|------|------------------|-------------------|-------------|
| Free | 7.0 | Yes | 2 |
| Pro | 8.0 | Yes | 3 |
| Agency | 8.5 | Yes | 3 |
| Custom | Configurable | Configurable | Configurable |

---

## 13. Production-Ready Checklist

Before any production command reads from this Bible, verify:

- [x] **Archetype defined:** The Forge King -- two modes (Architect / Furnace), Medusa Effect, Limerence trigger
- [x] **Color system complete:** All hex codes specified per role, generation status colors, color temperatures per context
- [x] **Typography locked:** JetBrains Mono (display/code) + Inter (body), full type scale with sizes and weights
- [x] **Logo treatment defined:** PrinceMarketing (Inter Bold) + .ai (JetBrains Mono Bold, Forge Blue), all alternate forms
- [x] **Brand voice documented:** Precise Authority voice, tone per context, word usage/avoidance lists
- [x] **Audience personas complete:** 3 personas (The Platform, The Builder, The Machine) with needs, fears, and service strategies
- [x] **API product principles locked:** 8 "always" rules, 8 "never" rules
- [x] **Developer experience principles:** 4-Second Rule, Copy-Paste Promise, documentation hierarchy
- [x] **Naming conventions specified:** Endpoint patterns, parameter casing, response fields, ID prefixes, documentation structure
- [x] **Production pipeline mapped:** Agent swarm architecture, Veo 3.1 exclusive video, quality feedback loop, tool-to-endpoint mapping
- [x] **Competitive positioning defined:** 6 competitors analyzed, 3 pillars of differentiation, positioning statement
- [x] **Brand relationship to .com documented:** Shared DNA table, handoff points, co-existence rules
- [x] **Critic scoring categories defined:** 6 universal + asset-specific dimensions, weights, thresholds per tier
- [x] **Video engine confirmed:** Veo 3.1 exclusive -- all capabilities documented

---

## Appendix A: Quick Reference Card

```
BRAND:        PrinceMarketing.ai
ARCHETYPE:    The Forge King
TAGLINE:      The engine that powers everything.
VOICE:        Precise Authority
BG COLOR:     #0A0A0F (Void)
BRAND COLOR:  #0EA5E9 (Forge Blue)
ACCENT:       #38BDF8 (Arc Light)
WARN:         #F59E0B (Ember)
DISPLAY FONT: JetBrains Mono Bold
BODY FONT:    Inter Regular/Medium
API BASE:     https://api.princemarketing.ai/v1
VIDEO ENGINE: Veo 3.1 (exclusive)
QUALITY MIN:  7.0 (Free) / 8.0 (Pro) / 8.5 (Agency)
```

---

## Appendix B: Cinematic Techniques (for Marketing Asset Generation)

### Shot Sizes for Product Imagery
| Shot | When | Effect |
|------|------|--------|
| Extreme close-up | API response detail, code syntax | Intimacy with the product |
| Close-up | Dashboard UI, quality score display | Focus and clarity |
| Medium | Developer at workstation, laptop with API output | Context + detail balance |
| Wide | The full workflow visualization, pipeline diagrams | Scale and architecture |

### Lighting Setups for Marketing Materials
| Setup | Name | Usage |
|-------|------|-------|
| Single monitor glow | "The Terminal" | Developer-focused hero shots |
| Overhead fluorescent + screen fill | "The Server Room" | Technical authority shots |
| Warm backlight + cool key | "The Forge" | Creative power shots, video generation showcase |
| Even soft light | "The Clean Room" | Documentation illustrations, UI screenshots |

### Camera Movement for Video Ads
| Movement | When | Veo 3.1 Prompt Cue |
|----------|------|-------------------|
| Slow push-in | Revealing an API response or generated asset | "Camera slowly pushes in toward the screen" |
| Tracking shot | Following a generation pipeline visualization | "Camera tracks laterally following the data flow" |
| Static with element motion | Code typing, asset rendering | "Static camera, on-screen elements animate" |
| Pull-back reveal | Showing the full dashboard/architecture | "Camera pulls back to reveal the complete system" |

---

## Appendix C: Business Model Reference

### Pricing Tiers

| Tier | Monthly Price | Credits/Month | Quality Threshold | Rate Limit | Target Persona |
|------|-------------|---------------|-------------------|-----------|----------------|
| **Free** | $0 | 100 generations | 7.0 | 10 req/min | Builder (testing) |
| **Pro** | $49 | 2,000 generations | 8.0 | 60 req/min | Builder (production) |
| **Agency** | $199 | 10,000 generations | 8.5 | 200 req/min | The Machine |
| **Enterprise** | Custom | Custom | Custom | Custom | Large agencies, .com platform |

### Credit Costs by Asset Type

| Asset Type | Credits | Typical Generation Time |
|-----------|---------|----------------------|
| Image (standard) | 1 | 3-5 seconds |
| Image (high-res) | 2 | 5-8 seconds |
| Copy (single format) | 0.5 | 1-2 seconds |
| Copy (multi-format bundle) | 2 | 3-5 seconds |
| Video (8s, 720p) | 5 | 30-60 seconds |
| Video (8s, 1080p) | 8 | 45-90 seconds |
| Brand package | 10 | 15-30 seconds |
| Quality score (standalone) | 0.25 | 1-2 seconds |

---

*This Bible is LOCKED as of 2026-03-31. All production commands (/cast, /wardrobe, /shoot, /dialogue, /edit, /critic, /title, /limerence) read from this document as their source of truth.*

*Next step: Run /cast to begin character and persona creation for the API's public-facing identity.*
