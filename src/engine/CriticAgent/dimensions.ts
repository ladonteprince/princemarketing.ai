// The 12 scoring dimensions — the backbone of the quality engine
// Each dimension has a key, display label, description, and weight multiplier.
// AI Artifact Detection carries 1.3x weight because artifacts are the
// fastest way to destroy client trust.

export const DIMENSION_DEFINITIONS = [
  {
    key: 'clarity',
    label: 'Clarity',
    description: 'How clear and immediately understandable is the message or visual?',
    weight: 1.0,
    appliesToTypes: ['image', 'video', 'copy'],
  },
  {
    key: 'composition',
    label: 'Composition',
    description: 'Visual balance, framing, rule of thirds, negative space usage.',
    weight: 1.0,
    appliesToTypes: ['image', 'video'],
  },
  {
    key: 'brandAlignment',
    label: 'Brand Alignment',
    description: 'Does the output align with the brand\'s visual identity and voice?',
    weight: 1.0,
    appliesToTypes: ['image', 'video', 'copy'],
  },
  {
    key: 'emotionalImpact',
    label: 'Emotional Impact',
    description: 'Does the asset evoke the intended emotional response?',
    weight: 1.0,
    appliesToTypes: ['image', 'video', 'copy'],
  },
  {
    key: 'technicalQuality',
    label: 'Technical Quality',
    description: 'Resolution, sharpness, noise levels, rendering quality.',
    weight: 1.0,
    appliesToTypes: ['image', 'video'],
  },
  {
    key: 'originality',
    label: 'Originality',
    description: 'How distinctive and non-generic is the output?',
    weight: 1.0,
    appliesToTypes: ['image', 'video', 'copy'],
  },
  {
    key: 'messageEffectiveness',
    label: 'Message Effectiveness',
    description: 'Does the core message land with the target audience?',
    weight: 1.0,
    appliesToTypes: ['image', 'video', 'copy'],
  },
  {
    key: 'visualHierarchy',
    label: 'Visual Hierarchy',
    description: 'Is there a clear focal point and reading order?',
    weight: 1.0,
    appliesToTypes: ['image', 'video'],
  },
  {
    key: 'colorPsychology',
    label: 'Color Psychology',
    description: 'Do colors support the emotional intent and brand palette?',
    weight: 1.0,
    appliesToTypes: ['image', 'video'],
  },
  {
    key: 'typography',
    label: 'Typography',
    description: 'Readability, hierarchy, font pairing, spacing.',
    weight: 1.0,
    appliesToTypes: ['image', 'copy'],
  },
  {
    key: 'ctaStrength',
    label: 'Call-to-Action Strength',
    description: 'Is the CTA clear, compelling, and action-oriented?',
    weight: 1.0,
    appliesToTypes: ['image', 'video', 'copy'],
  },
  {
    key: 'aiArtifactDetection',
    label: 'AI Artifact Detection',
    description: 'Absence of AI tells: malformed hands, text gibberish, uncanny faces, temporal flicker.',
    weight: 1.3,
    appliesToTypes: ['image', 'video'],
  },
] as const;

export type DimensionKey = (typeof DIMENSION_DEFINITIONS)[number]['key'];
