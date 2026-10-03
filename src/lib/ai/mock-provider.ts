import { AIProvider, SafetyCheckResult } from './types';
import { CharacterData } from '@/types';

export class MockAIProvider implements AIProvider {
  name = 'Mock Local AI Engine (Offline Safe)';

  async checkImageSafety(imageUrlOrBase64: string, characterContext = ''): Promise<SafetyCheckResult> {
    const lowerContext = (characterContext + ' ' + imageUrlOrBase64).toLowerCase();

    // Check for explicitly prohibited vulgar terms
    if (lowerContext.includes('nudity') || lowerContext.includes('pornographic') || lowerContext.includes('genital') || lowerContext.includes('explicit_nude')) {
      return {
        status: 'FAIL',
        reason: 'Image contains explicitly prohibited vulgar material (nudity/pornography).',
        confidence: 0.98,
        flagged_elements: ['explicit_vulgarity'],
      };
    }

    // Check for ambiguous or suspicious flags requiring admin review
    if (lowerContext.includes('borderline') || lowerContext.includes('review_needed') || lowerContext.includes('nsfw_suspect')) {
      return {
        status: 'REVIEW_REQUIRED',
        reason: 'Image safety classifier detected potential policy ambiguity requiring organizer review.',
        confidence: 0.65,
        flagged_elements: ['ambiguous_content'],
      };
    }

    // Ordinary horror, monsters, fantasy dark themes pass safety safely
    return {
      status: 'PASS',
      reason: 'Content complies with competition visual guidelines. Dark/horror themes permitted.',
      confidence: 0.95,
    };
  }

  async evaluateCharacter(
    hero: CharacterData,
    villain: CharacterData,
    relationship: string,
    conflict: string,
    supporting?: CharacterData
  ) {
    const combinedHeroText = `${hero.name} ${hero.personality} ${hero.goal} ${hero.strengths} ${hero.weakness} ${hero.conflict} ${hero.description}`;
    const combinedVillainText = `${villain.name} ${villain.personality} ${villain.goal} ${villain.strengths} ${villain.weakness} ${villain.conflict} ${villain.description}`;
    const combinedRelText = `${relationship} ${conflict}`;

    const heroWords = combinedHeroText.trim().split(/\s+/).filter(Boolean).length;
    const villainWords = combinedVillainText.trim().split(/\s+/).filter(Boolean).length;
    const relWords = combinedRelText.trim().split(/\s+/).filter(Boolean).length;
    const totalWords = heroWords + villainWords + relWords;

    // Detect creativity keywords (conflict depth, relationship nuance, world building)
    const keywords = ['betrayal', 'duality', 'arch-nemesis', 'legacy', 'corruption', 'destiny', 'symbiotic', 'ideological', 'catalyst', 'redemption', 'motive', 'dystopian', 'shadow', 'magic', 'monster', 'dark'];
    const lowerAll = (combinedHeroText + combinedVillainText + combinedRelText).toLowerCase();
    const keywordCount = keywords.filter(k => lowerAll.includes(k)).length;

    // Character Development Score (Max 30)
    // Sparse text (< 15 words) gets low score (6-12), Detailed text (> 40 words) gets high score (20-30)
    let charDev = Math.min(30, Math.max(6, Math.round(8 + (heroWords + villainWords) / 3.5 + keywordCount * 1.5)));

    // Relationship Score (Max 20)
    // Sparse relationship text (< 10 words) gets low score (4-9), Detailed text (> 25 words) gets high score (14-20)
    let relScore = Math.min(20, Math.max(4, Math.round(5 + relWords / 2 + keywordCount * 1.2)));

    // Originality Score (Max 15)
    const uniqueWords = new Set(lowerAll.split(/\s+/)).size;
    let origScore = Math.min(15, Math.max(3, Math.round(4 + uniqueWords / 6 + keywordCount * 1.2)));

    const feedback: string[] = [];
    if (totalWords < 25) {
      feedback.push('Submission lacks detailed character development. Provide richer descriptions and motivations for higher scores.');
      feedback.push('Hero-Villain relationship statement is sparse. Expand on central conflict and narrative stakes.');
    } else {
      feedback.push(`Hero "${hero.name || 'Hero'}" demonstrates clear narrative motivation and character arcs.`);
      feedback.push(`Villain "${villain.name || 'Villain'}" creates strong moral opposition and high dramatic conflict.`);
      feedback.push(`Hero-Villain relationship dynamic exhibits strong thematic depth.`);
    }

    if (supporting?.name && supporting.name.trim().length > 0) {
      feedback.push(`Supporting character "${supporting.name}" adds additional world-building richness.`);
      charDev = Math.min(30, charDev + 2);
    }

    return {
      character_development: charDev,
      relationship: relScore,
      originality: origScore,
      feedback,
    };
  }

  async evaluateVisuals(
    prompts: { hero: string; villain: string; supporting?: string },
    imageUrls: { hero?: string; villain?: string; supporting?: string }
  ) {
    const combinedPrompts = `${prompts.hero} ${prompts.villain} ${prompts.supporting || ''}`;
    const words = combinedPrompts.trim().split(/\s+/).filter(Boolean).length;
    const lowerPrompts = combinedPrompts.toLowerCase();

    const artisticKeywords = ['cinematic', 'volumetric', 'lighting', 'cyberpunk', 'photorealistic', 'octane', '4k', 'dramatic', 'unreal engine', 'concept art', 'hyper-detailed', 'dark', 'aesthetic', 'monster'];
    const artCount = artisticKeywords.filter(k => lowerPrompts.includes(k)).length;

    // Visual Quality Score (Max 15)
    const hasImages = (imageUrls.hero ? 1 : 0) + (imageUrls.villain ? 1 : 0);
    const visualQual = Math.min(15, Math.max(5, Math.round(7 + hasImages * 2.5 + artCount * 1.5)));

    // Prompt Quality Score (Max 10)
    // Sparse prompt (< 10 words) gets 3-5, Detailed prompt (> 20 words) gets 7-10
    const promptQual = Math.min(10, Math.max(2, Math.round(3 + words / 3.5 + artCount * 1.2)));

    // Prompt Image Consistency (Max 10)
    const consistency = Math.min(10, Math.max(3, Math.round(4 + (prompts.hero.length > 20 ? 3 : 1) + artCount)));

    const feedback: string[] = [];
    if (words < 12) {
      feedback.push('Visual prompts are basic. Incorporate cinematic lighting, framing, and art style descriptors for higher visual quality scores.');
    } else {
      feedback.push('Visual prompts effectively specify lighting, camera angle, and aesthetic style.');
      feedback.push('Visual identity matches character personality descriptions.');
    }

    return {
      visual_quality: visualQual,
      prompt_quality: promptQual,
      prompt_image_consistency: consistency,
      feedback,
    };
  }

  async evaluateRound3Marketing(
    marketingAngle: string,
    intendedAudienceResponse: string,
    tagline: string,
    promotionalCopy: string,
    promotionalAssetUrl?: string
  ) {
    const combinedText = `${marketingAngle} ${intendedAudienceResponse} ${tagline} ${promotionalCopy}`;
    const words = combinedText.trim().split(/\s+/).filter(Boolean).length;
    const lowerText = combinedText.toLowerCase();

    const mktKeywords = ['franchise', 'cinematic', 'transmedia', 'audience', 'hook', 'blockbuster', 'global', 'viral', 'strategy', 'narrative', 'immersive', 'horror', 'gaming'];
    const kwCount = mktKeywords.filter(k => lowerText.includes(k)).length;

    // Marketing Strategy (Max 25)
    const angleWords = marketingAngle.trim().split(/\s+/).filter(Boolean).length;
    const marketingStrategy = Math.min(25, Math.max(6, Math.round(8 + angleWords / 1.5 + kwCount * 1.8)));

    // Tagline Punch (Max 20)
    const taglineWords = tagline.trim().split(/\s+/).filter(Boolean).length;
    const taglinePunch = Math.min(20, Math.max(5, Math.round(7 + taglineWords * 0.8 + kwCount * 1.5)));

    // Audience Engagement (Max 20)
    const respWords = intendedAudienceResponse.trim().split(/\s+/).filter(Boolean).length;
    const audienceEng = Math.min(20, Math.max(5, Math.round(7 + respWords / 1.5 + kwCount * 1.5)));

    // Copywriting Quality (Max 20)
    const copyWords = promotionalCopy.trim().split(/\s+/).filter(Boolean).length;
    const copywritingQual = Math.min(20, Math.max(5, Math.round(7 + copyWords / 2.5 + kwCount * 1.5)));

    // Visual Poster Quality (Max 15)
    const visualPosterQual = Math.min(15, Math.max(5, promotionalAssetUrl ? 14 : 9));

    const feedback: string[] = [];
    if (words < 20) {
      feedback.push('Marketing submission is sparse. Provide detailed promotional copy and clear audience positioning for higher scores.');
    } else {
      feedback.push(`Tagline "${tagline}" delivers a strong, memorable promotional hook.`);
      feedback.push('Marketing strategy demonstrates clear commercial vision and target audience alignment.');
      feedback.push('Promotional copy effectively communicates franchise scale and narrative intrigue.');
    }

    if (promotionalAssetUrl) {
      feedback.push('Key visual promotional poster asset uploaded and verified.');
    } else {
      feedback.push('Consider adding a promotional poster asset to maximize presentation value.');
    }

    return {
      marketing_strategy: marketingStrategy,
      tagline_punch: taglinePunch,
      audience_engagement: audienceEng,
      copywriting_quality: copywritingQual,
      visual_poster_quality: visualPosterQual,
      feedback,
    };
  }
}
