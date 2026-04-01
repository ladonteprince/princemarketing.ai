# MuAPI Full Production Catalog — PrinceMarketing.ai Engine Reference

> Complete catalog of ALL available models through MuAPI.
> Base URL: `https://api.muapi.ai/api/v1`
> Auth: `x-api-key: {MUAPI_API_KEY}`
> Polling: `GET /predictions/{id}/result`

---

## VIDEO GENERATION

### Seedance 2.0 (Primary — INTEGRATED)
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `seedance-v2.0-t2v` | `/seedance-v2.0-t2v` | Text to video | LIVE |
| `seedance-v2.0-i2v` | `/seedance-v2.0-i2v` | Image to video (animate stills) | LIVE |
| `seedance-v2.0-omni-reference` | `/seedance-v2.0-omni-reference` | Multi-ref with @imageN tags | LIVE |
| `seedance-v2.0-new-omni` | `/seedance-v2.0-new-omni` | Upgraded omni (default) | LIVE |
| `seedance-v2.0-character` | `/seedance-v2.0-character` | Character consistency | LIVE |
| `seedance-v2.0-extend` | `/seedance-v2.0-extend` | Extend video clips | LIVE |
| `seedance-v2.0-video-edit` | `/seedance-v2.0-video-edit` | AI edit existing video | LIVE |
| `seedance-v2.0-watermark-remover` | `/seedance-v2.0-watermark-remover` | Auto watermark removal | LIVE |

### Veo 3 (Google — NEW OPPORTUNITY)
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `veo3-text-to-video` | `/veo3-text-to-video` | Text to video (with audio!) | NOT INTEGRATED |
| `veo3-fast-text-to-video` | `/veo3-fast-text-to-video` | Fast t2v with audio | NOT INTEGRATED |
| `veo3-image-to-video` | `/veo3-image-to-video` | Image to video with audio | NOT INTEGRATED |
| `veo3-fast-image-to-video` | `/veo3-fast-image-to-video` | Fast i2v with audio | NOT INTEGRATED |

### Wan 2.x
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `wan2.1-text-to-video` | `/wan2.1-text-to-video` | Alternative t2v | NOT INTEGRATED |
| `wan2.1-image-to-video` | `/wan2.1-image-to-video` | Alternative i2v | NOT INTEGRATED |
| `wan2.2-text-to-video` | `/wan2.2-text-to-video` | Latest Wan t2v | NOT INTEGRATED |
| `wan2.2-image-to-video` | `/wan2.2-image-to-video` | Latest Wan i2v | NOT INTEGRATED |
| `wan2.2-speech-to-video` | `/wan2.2-speech-to-video` | **Speech-driven video!** | NOT INTEGRATED |

### Other Video
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `runway-text-to-video` | `/runway-text-to-video` | Runway Gen-3 | NOT INTEGRATED |
| `runway-image-to-video` | `/runway-image-to-video` | Runway i2v | NOT INTEGRATED |
| `midjourney-v7-image-to-video` | `/midjourney-v7-image-to-video` | MJ video | NOT INTEGRATED |
| `hunyuan-text-to-video` | `/hunyuan-text-to-video` | Hunyuan t2v | NOT INTEGRATED |
| `hunyuan-image-to-video` | `/hunyuan-image-to-video` | Hunyuan i2v | NOT INTEGRATED |

---

## AUDIO / MUSIC GENERATION

### Suno Music Suite (NEW — TO INTEGRATE)
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `suno-create-music` | `/suno-create-music` | Generate music from prompt | NOT INTEGRATED |
| `suno-remix-music` | `/suno-remix-music` | Remix existing track | NOT INTEGRATED |
| `suno-extend-music` | `/suno-extend-music` | Extend a music clip | NOT INTEGRATED |
| `suno-generate-sounds` | `/suno-generate-sounds` | Sound effects | NOT INTEGRATED |
| `suno-generate-lyrics` | `/suno-generate-lyrics` | AI lyrics generation | NOT INTEGRATED |
| `suno-boost-music-style` | `/suno-boost-music-style` | Style enhancement | NOT INTEGRATED |
| `suno-add-vocals` | `/suno-add-vocals` | Add vocals to instrumental | NOT INTEGRATED |
| `suno-add-instrumental` | `/suno-add-instrumental` | Add instrumental to vocals | NOT INTEGRATED |
| `suno-generate-mashup` | `/suno-generate-mashup` | Mashup two tracks | NOT INTEGRATED |

### MmAudio (Video-to-Audio Sync)
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `mmaudio-v2/text-to-audio` | `/mmaudio-v2/text-to-audio` | Generate audio from text | NOT INTEGRATED |
| `mmaudio-v2/video-to-video` | `/mmaudio-v2/video-to-video` | **Add synced audio to video!** | NOT INTEGRATED |

---

## IMAGE GENERATION

### Currently Integrated (Gemini/Nano Banana)
| Model | Provider | Use Case | Status |
|-------|----------|----------|--------|
| Nano Banana Pro (`gemini-3-pro-image-preview`) | Gemini API | High-fidelity images | LIVE |
| Nano Banana 2 (`gemini-3.1-flash-image-preview`) | Gemini API | Fast images | LIVE |

### Available on MuAPI (NEW OPPORTUNITY)
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `flux-kontext-pro-t2i` | `/flux-kontext-pro-t2i` | Flux Kontext Pro (text) | NOT INTEGRATED |
| `flux-kontext-pro-i2i` | `/flux-kontext-pro-i2i` | Flux Kontext Pro (edit) | NOT INTEGRATED |
| `flux-kontext-max-t2i` | `/flux-kontext-max-t2i` | Flux Kontext Max | NOT INTEGRATED |
| `flux-kontext-effects` | `/flux-kontext-effects` | Style effects | NOT INTEGRATED |
| `midjourney-v7-text-to-image` | `/midjourney-v7-text-to-image` | MJ v7 generation | NOT INTEGRATED |
| `midjourney-v7-style-reference` | `/midjourney-v7-style-reference` | MJ style reference | NOT INTEGRATED |
| `midjourney-v7-omni-reference` | `/midjourney-v7-omni-reference` | MJ omni reference | NOT INTEGRATED |
| `gpt4o-text-to-image` | `/gpt4o-text-to-image` | GPT-4o image gen | NOT INTEGRATED |
| `gpt4o-image-to-image` | `/gpt4o-image-to-image` | GPT-4o edit | NOT INTEGRATED |
| `reve-text-to-image` | `/reve-text-to-image` | Reve generation | NOT INTEGRATED |

### Image Processing
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `ai-image-upscale` | `/ai-image-upscale` | Upscale low-res images | NOT INTEGRATED |
| `ai-image-face-swap` | `/ai-image-face-swap` | Face swap in images | NOT INTEGRATED |
| `ai-background-remover` | `/ai-background-remover` | Remove backgrounds | NOT INTEGRATED |
| `ai-product-shot` | `/ai-product-shot` | Product photography | NOT INTEGRATED |
| `ai-product-photography` | `/ai-product-photography` | Professional product shots | NOT INTEGRATED |
| `ai-skin-enhancer` | `/ai-skin-enhancer` | Skin retouching | NOT INTEGRATED |
| `ai-image-extension` | `/ai-image-extension` | Extend/outpaint images | NOT INTEGRATED |
| `ai-object-eraser` | `/ai-object-eraser` | Remove objects from images | NOT INTEGRATED |

### Video Processing
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `ai-video-face-swap` | `/ai-video-face-swap` | Face swap in videos | NOT INTEGRATED |
| `ai-dress-change` | `/ai-dress-change` | Change outfit in video | NOT INTEGRATED |
| `ai-clipping` | `/ai-clipping` | Auto-clip highlights | NOT INTEGRATED |

### Prompt Engineering
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `generate_video_prompt` | `/generate_video_prompt` | AI-generate video prompts | NOT INTEGRATED |
| `generate_video_scene_prompts` | `/generate_video_scene_prompts` | Multi-scene breakdown | NOT INTEGRATED |

### Social Content
| Model | Endpoint | Use Case | Status |
|-------|----------|----------|--------|
| `tiktok-carousel` | `/tiktok-carousel` | TikTok carousel generator | NOT INTEGRATED |

---

## PRODUCTION TIMELINE ARCHITECTURE (Proposed)

### Multi-Track Timeline
```
Track 1: VIDEO    [==== Scene 1 (5s) ====][==== Scene 2 (5s) ====][==== Scene 3 (5s) ====]
Track 2: AUDIO    [========= Background Music (Suno) =========]
Track 3: SFX      [  door slam  ][         ][  footsteps  ]
Track 4: VOICEOVER[========= AI narration (MmAudio) =========]
```

### AI Sync Pipeline
1. **Scene Breakdown** — Claude analyzes script → generates per-scene prompts
2. **Video Generation** — Seedance renders each scene clip
3. **Audio Generation** — Suno creates background music matching mood
4. **SFX Layer** — MmAudio generates scene-appropriate sound effects
5. **Sync** — MmAudio `video-to-video` adds synced audio to the final cut
6. **Post-Processing** — Watermark removal + upscaling

### Key Integration: MmAudio video-to-video
This model takes a video and generates perfectly synced audio for it.
This is the "magic sync" — it watches the video and creates matching audio.
Combined with user-imported audio, this creates a complete production.

---

## INTEGRATION PRIORITY

### Phase 1: Audio Engine (Immediate)
- [ ] Suno music generation (`suno-create-music`)
- [ ] Suno sound effects (`suno-generate-sounds`)
- [ ] MmAudio video-to-audio sync (`mmaudio-v2/video-to-video`)
- [ ] Audio import/upload support

### Phase 2: Image Engine Expansion
- [ ] Product photography (`ai-product-shot`)
- [ ] Background removal (`ai-background-remover`)
- [ ] Image upscaling (`ai-image-upscale`)
- [ ] Face swap (`ai-image-face-swap`)

### Phase 3: Advanced Video
- [ ] Veo 3 as alternative engine (with native audio)
- [ ] Face swap in video (`ai-video-face-swap`)
- [ ] Dress change (`ai-dress-change`)
- [ ] TikTok carousel (`tiktok-carousel`)

### Phase 4: Multi-Model Routing
- [ ] AI selects best model per task (Seedance vs Veo vs Wan vs Runway)
- [ ] Cost optimization based on quality requirements
- [ ] A/B model testing with quality scoring
