# Seedance 2.0 on MuAPI — Complete Integration Reference

> Internal documentation for PrinceMarketing.ai video generation engine.
> All models go through `https://api.muapi.ai/api/v1`

## Authentication

```
Header: x-api-key: {MUAPI_API_KEY}
```

## Available Models

### 1. Text-to-Video (`seedance-v2.0-t2v`)
**Endpoint:** `POST /seedance-v2.0-t2v`
**Use case:** Generate video from a text prompt. Primary workhorse.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Up to ~2000 chars. Cinematic direction. |
| `negative_prompt` | string | No | Always include `NO TEXT, NO SUBTITLES, NO CAPTIONS` |
| `duration` | int | No | 5, 10, or 15 seconds (default: 5) |
| `aspect_ratio` | string | No | `16:9`, `9:16`, `1:1` (default: `16:9`) |
| `seed` | int | No | For reproducibility |

**Cost:** ~$0.30/sec ($1.50/5s, $3.00/10s, $4.50/15s)
**Status:** INTEGRATED in PrinceMarketing.ai

---

### 2. Image-to-Video (`seedance-v2.0-i2v`)
**Endpoint:** `POST /seedance-v2.0-i2v`
**Use case:** Animate a still image into a video clip. Great for product shots.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Describe the motion/animation |
| `image` | string (URL) | Yes | Source image to animate |
| `negative_prompt` | string | No | Unwanted elements |
| `duration` | int | No | 5, 10, or 15 seconds |
| `aspect_ratio` | string | No | `16:9`, `9:16`, `1:1` |

**Cost:** ~$0.30/sec
**Status:** MODEL DEFINED but NOT exposed to customers via .com UI

**IMPROVEMENT NEEDED:** Add i2v as a generation mode. Users upload a product photo, AI animates it into a video. Huge for e-commerce.

---

### 3. Character Reference (`seedance-v2.0-character`)
**Endpoint:** `POST /seedance-v2.0-character`
**Use case:** Generate video with consistent character appearance across clips.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Scene description with character |
| `images_list` | array[string] | Yes | Character reference images (1-9 URLs) |
| `negative_prompt` | string | No | |
| `duration` | int | No | 5, 10, or 15 seconds |
| `aspect_ratio` | string | No | `16:9`, `9:16`, `1:1` |

**Cost:** ~$0.15/request based on usage data
**Status:** MODEL DEFINED but auto-selected only when reference images are provided

**IMPROVEMENT NEEDED:** Expose character mode in UI with character sheet upload. Let users build a "brand character" that appears consistently across all video content.

---

### 4. Omni-Reference (`seedance-v2.0-omni-reference`)
**Endpoint:** `POST /seedance-v2.0-omni-reference`
**Use case:** Multi-reference generation. Use `@image1`..`@image9` tokens in prompt to reference specific images.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Use `@image1`..`@image9` for refs |
| `images_list` | array[string] | Yes | Maps to @imageN in order |
| `negative_prompt` | string | No | |
| `duration` | int | No | 5, 10, or 15 seconds |
| `aspect_ratio` | string | No | `16:9`, `9:16`, `1:1` |

**Cost:** ~$0.30/sec
**Status:** INTEGRATED (auto-selected when images provided)

---

### 5. New Omni (`seedance-v2.0-new-omni`)
**Endpoint:** `POST /seedance-v2.0-new-omni`
**Use case:** Updated omni-reference model with improved quality.

**Cost:** TBD (7 requests, $0.00 in testing)
**Status:** NOT INTEGRATED — potentially newer/better version of omni-reference

**IMPROVEMENT NEEDED:** Evaluate quality vs original omni-reference. May be a free upgrade.

---

### 6. Video Extend (`seedance-v2.0-extend`)
**Endpoint:** `POST /seedance-v2.0-extend` (assumed)
**Use case:** Extend an existing video clip by generating additional seconds.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Continuation direction |
| `video` | string (URL) | Yes | Source video to extend |
| `duration` | int | No | Additional seconds to generate |

**Status:** MODEL DEFINED in code but NOT used in production

**IMPROVEMENT NEEDED:** Critical for production workflows. Generate 5s clip, extend to 15s+ for YouTube content. Would enable "clip chaining" for longer videos.

---

### 7. Watermark Remover (`seedance-v2.0-watermark-remover`)
**Endpoint:** `POST /seedance-v2.0-watermark-remover`
**Use case:** Remove watermarks from generated or uploaded videos.

**Cost:** ~$0.003/request (very cheap)
**Status:** NOT INTEGRATED in PrinceMarketing

**IMPROVEMENT NEEDED:** Auto-run watermark removal as post-processing step. Nearly free, significant quality improvement.

---

### 8. Video Edit (`seedance-v2.0-video-edit`)
**Endpoint:** `POST /seedance-v2.0-video-edit`
**Use case:** Edit/modify existing video clips (style transfer, object removal, etc.)

**Cost:** TBD (2 requests, $0.00 in testing)
**Status:** NOT INTEGRATED

**IMPROVEMENT NEEDED:** Enable "remix" mode where users upload a video and apply AI edits. Powerful for repurposing content.

---

## Polling Pattern

All models use async prediction:

```
1. POST /model-name → { id: "prediction_id" }
2. GET /predictions/{id}/result → { status, output, error }
   Poll every 10-15s until status = "completed" or "failed"
```

## Production Best Practices

1. **85/15 Rule:** 85% close-up shots, 15% medium max. No long shots.
2. **Action-based prompts:** Describe motion, not camera angles
3. **15s clips, expect 10 usable** — trim in post
4. **Copy-paste wardrobe descriptions** in every prompt for consistency
5. **Camera quality prompt:** "Shot on Phase One XF IQ4 150MP..." improves render
6. **Micro-expressions:** Use parentheticals `(slight smile forming)` for facial animation
7. **Banned words:** No "blood" (→ "red mark"), no "nightclub" (→ "exclusive lounge")
8. **AI character sheets** bypass face detection better than real photos
9. **Don't use @image for frame chaining or props** — only for character/product reference

## What's Missing in PrinceMarketing (Priority Order)

| Priority | Feature | Model | Impact |
|----------|---------|-------|--------|
| **P0** | Image-to-Video in UI | `i2v` | Users upload product photo → animated video |
| **P0** | Auto watermark removal | `watermark-remover` | Free quality boost on every generation |
| **P1** | Video extend/chain | `extend` | 5s → 15s+ for YouTube content |
| **P1** | Character persistence | `character` | Brand character across campaign |
| **P2** | New omni evaluation | `new-omni` | Potentially free quality upgrade |
| **P2** | Video remix/edit | `video-edit` | Repurpose existing content |
| **P3** | Seed parameter | all | Reproducible generations |
