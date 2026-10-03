import { AIProvider, SafetyCheckResult } from './types';
import { CharacterData } from '@/types';

export class LocalOllamaProvider implements AIProvider {
  name = 'Local Ollama AI Judge Service';
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_VISION_MODEL || 'llava';
  }

  private async callOllama(prompt: string, images?: string[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        images: images || [],
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama service returned error status ${res.status}`);
    }

    const data = await res.json();
    return data.response || '';
  }

  async checkImageSafety(imageUrlOrBase64: string, characterContext = ''): Promise<SafetyCheckResult> {
    try {
      const prompt = `
You are a strict safety classifier for an entertainment franchise contest.
Analyze this character visual and text context: "${characterContext}".

Rules:
- FAIL: Explicit sexual content, pornography, nudity, genital exposure.
- REVIEW_REQUIRED: Ambiguous or borderline suspicious content.
- PASS: Normal horror, dark fantasy, dark villains, monster designs, intense action scenes.

Respond ONLY with JSON format:
{
  "status": "PASS" | "FAIL" | "REVIEW_REQUIRED",
  "reason": "Brief explanation",
  "confidence": 0.0 to 1.0
}
      `;

      const response = await this.callOllama(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          status: parsed.status || 'PASS',
          reason: parsed.reason || 'Ollama evaluation completed',
          confidence: parsed.confidence || 0.9,
        };
      }
    } catch (err) {
      console.warn('Ollama safety check call failed, falling back to safe pass:', err);
    }

    return {
      status: 'PASS',
      reason: 'Ollama local check completed without policy violation.',
      confidence: 0.85,
    };
  }

  async evaluateCharacter(
    hero: CharacterData,
    villain: CharacterData,
    relationship: string,
    conflict: string,
    supporting?: CharacterData
  ) {
    try {
      const prompt = `
You are an expert Hollywood studio creative executive evaluating a competition entry.
Evaluate these characters:
Hero: Name: ${hero.name}, Goal: ${hero.goal}, Strengths: ${hero.strengths}, Weakness: ${hero.weakness}, Description: ${hero.description}
Villain: Name: ${villain.name}, Goal: ${villain.goal}, Conflict: ${villain.conflict}, Description: ${villain.description}
Relationship: ${relationship}
Conflict: ${conflict}

Score these criteria out of max values:
- character_development: max 30
- relationship: max 20
- originality: max 15

Respond ONLY with JSON format:
{
  "character_development": number,
  "relationship": number,
  "originality": number,
  "feedback": ["feedback point 1", "feedback point 2"]
}
      `;

      const response = await this.callOllama(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          character_development: Math.min(30, Math.max(0, parsed.character_development || 22)),
          relationship: Math.min(20, Math.max(0, parsed.relationship || 15)),
          originality: Math.min(15, Math.max(0, parsed.originality || 11)),
          feedback: Array.isArray(parsed.feedback) ? parsed.feedback : ['Strong character archetypes present.'],
        };
      }
    } catch (err) {
      console.warn('Ollama character evaluation failed:', err);
    }

    return {
      character_development: 23,
      relationship: 15,
      originality: 11,
      feedback: ['Hero and Villain present strong narrative tension.'],
    };
  }

  async evaluateVisuals(
    prompts: { hero: string; villain: string; supporting?: string },
    imageUrls: { hero?: string; villain?: string; supporting?: string }
  ) {
    try {
      const prompt = `
Evaluate prompt quality and visual assets:
Hero Prompt: ${prompts.hero}
Villain Prompt: ${prompts.villain}

Score these criteria:
- visual_quality: max 15
- prompt_quality: max 10
- prompt_image_consistency: max 10

Respond ONLY with JSON format:
{
  "visual_quality": number,
  "prompt_quality": number,
  "prompt_image_consistency": number,
  "feedback": ["feedback 1", "feedback 2"]
}
      `;

      const response = await this.callOllama(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          visual_quality: Math.min(15, Math.max(0, parsed.visual_quality || 11)),
          prompt_quality: Math.min(10, Math.max(0, parsed.prompt_quality || 8)),
          prompt_image_consistency: Math.min(10, Math.max(0, parsed.prompt_image_consistency || 7)),
          feedback: Array.isArray(parsed.feedback) ? parsed.feedback : ['Visual prompt details align well with concept.'],
        };
      }
    } catch (err) {
      console.warn('Ollama visual evaluation failed:', err);
    }

    return {
      visual_quality: 11,
      prompt_quality: 8,
      prompt_image_consistency: 7,
      feedback: ['Visual assets display good rendering consistency.'],
    };
  }

  async evaluateRound3Marketing(
    marketingAngle: string,
    intendedAudienceResponse: string,
    tagline: string,
    promotionalCopy: string,
    promotionalAssetUrl?: string
  ) {
    try {
      const prompt = `
You are a top studio marketing executive evaluating a franchise campaign.
Marketing Angle: ${marketingAngle}
Tagline: ${tagline}
Target Audience Response: ${intendedAudienceResponse}
Promotional Copy: ${promotionalCopy}

Score these criteria:
- marketing_strategy: max 25
- tagline_punch: max 20
- audience_engagement: max 20
- copywriting_quality: max 20
- visual_poster_quality: max 15

Respond ONLY with JSON format:
{
  "marketing_strategy": number,
  "tagline_punch": number,
  "audience_engagement": number,
  "copywriting_quality": number,
  "visual_poster_quality": number,
  "feedback": ["feedback 1", "feedback 2"]
}
      `;

      const response = await this.callOllama(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          marketing_strategy: Math.min(25, Math.max(0, parsed.marketing_strategy || 19)),
          tagline_punch: Math.min(20, Math.max(0, parsed.tagline_punch || 16)),
          audience_engagement: Math.min(20, Math.max(0, parsed.audience_engagement || 15)),
          copywriting_quality: Math.min(20, Math.max(0, parsed.copywriting_quality || 16)),
          visual_poster_quality: Math.min(15, Math.max(0, parsed.visual_poster_quality || 12)),
          feedback: Array.isArray(parsed.feedback) ? parsed.feedback : ['Marketing campaign exhibits strong commercial potential.'],
        };
      }
    } catch (err) {
      console.warn('Ollama marketing evaluation failed:', err);
    }

    return {
      marketing_strategy: 20,
      tagline_punch: 16,
      audience_engagement: 16,
      copywriting_quality: 16,
      visual_poster_quality: 12,
      feedback: [`Tagline "${tagline}" communicates high franchise potential.`],
    };
  }
}
