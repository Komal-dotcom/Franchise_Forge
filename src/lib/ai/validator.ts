import { Round1Submission, Round2Submission, CharacterData } from '@/types';
import { isValidS3Path, getPresignedDownloadUrl } from '../s3';

export interface FieldValidationDetail {
  field: string;
  label: string;
  valid: boolean;
  reason: string;
}

export interface SubmissionValidationResult {
  valid: boolean;
  status: 'VALID' | 'WARNING' | 'INVALID_SUBMISSION';
  reason: string;
  fieldDetails: Record<string, FieldValidationDetail>;
  scoreCap?: number;
}

/**
 * Common English words, prepositions, pronouns, verbs, studio & creative domain vocabulary
 */
const COMMON_VOCABULARY = new Set([
  // Common functional & descriptive words
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'up', 'about', 'into',
  'over', 'after', 'beneath', 'between', 'through', 'during', 'before', 'under', 'around', 'among', 'against',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'he', 'she', 'it', 'they', 'we', 'you', 'i', 'my',
  'his', 'her', 'its', 'their', 'our', 'your', 'me', 'him', 'them', 'us', 'who', 'whom', 'whose', 'which', 'what',
  'this', 'that', 'these', 'those', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'where', 'when', 'why', 'how',
  
  // Narrative & Character concept vocabulary
  'hero', 'villain', 'character', 'name', 'goal', 'personality', 'strength', 'strengths', 'weakness', 'conflict',
  'description', 'story', 'world', 'realm', 'space', 'city', 'star', 'sun', 'planet', 'galaxy', 'universe', 'empire',
  'soldier', 'warrior', 'sentinel', 'knight', 'commander', 'captain', 'hacker', 'agent', 'lord', 'king', 'queen',
  'master', 'prince', 'princess', 'demon', 'monster', 'angel', 'ghost', 'spirit', 'dragon', 'titan', 'witch', 'wizard',
  'dark', 'darkness', 'light', 'shadow', 'void', 'fire', 'water', 'earth', 'air', 'ice', 'storm', 'blood', 'soul',
  'magic', 'power', 'energy', 'cyber', 'punk', 'future', 'futuristic', 'ancient', 'cosmic', 'photonic', 'neural',
  'protect', 'save', 'fight', 'destroy', 'reclaim', 'restore', 'conquer', 'rule', 'seek', 'find', 'search', 'escape',
  'kill', 'live', 'die', 'survive', 'defeat', 'vanquish', 'control', 'harness', 'execute', 'avenge', 'preserve',
  'secret', 'hidden', 'stolen', 'lost', 'found', 'corrupt', 'pure', 'luminous', 'spectral', 'immortal', 'mortal',
  'battle', 'war', 'peace', 'freedom', 'justice', 'vengeance', 'truth', 'lie', 'fate', 'destiny', 'hope', 'fear',
  'love', 'hate', 'glory', 'honor', 'chaos', 'order', 'blade', 'sword', 'shield', 'armor', 'spear', 'gun', 'cannon',
  'mech', 'robot', 'drone', 'ship', 'starship', 'temple', 'ruin', 'alley', 'tower', 'core', 'system', 'matrix',
  'cinematic', 'render', 'photo', '4k', '8k', 'art', 'concept', 'lighting', 'aesthetic', 'glowing', 'neon', 'dramatic',
  'hyper', 'detailed', 'portrait', 'full', 'body', 'standing', 'wielding', 'wearing', 'surrounded', 'background',
  'mysterious', 'stoic', 'ruthless', 'cold', 'calculating', 'rebellious', 'noble', 'malevolent', 'pragmatic', 'witty',
]);

/**
 * English prefixes and suffixes for morphologically valid words
 */
const COMMON_AFFIXES = ['ing', 'ed', 'ly', 'tion', 'sion', 'ment', 'ness', 'less', 'ful', 'able', 'ible', 'ous', 'ive', 'al', 'ic', 'ics', 'er', 'or', 'est', 'ish', 'ia', 'ian', 'is', 'us', 'yn', 'on', 'an', 'en', 'ar', 'ant', 'ent', 'ate', 'ite', 'ize', 'ise', 'ary', 'ery', 'ory', 'ity', 'ty', 'ure', 'age', 'oid', 'st'];

/**
 * Recognized valid short fantasy/sci-fi character name exceptions
 */
const VALID_NAME_EXCEPTIONS = new Set([
  'nyx', 'kael', 'zyra', 'xyron', 'vaelora', 'neo', 'thorne', 'solaria', 'aetheria', 'vesper', 'orion', 'lyra',
  'archon', 'vane', 'shadow', 'blade', 'void', 'aether', 'zane', 'rex', 'kira', 'ren', 'jax', 'dane', 'loki',
]);

/**
 * Checks if a single word token is linguistically plausible
 */
function isRecognizedToken(token: string): boolean {
  // If token is compound with hyphens or slashes (e.g. high-tech, gaming/tech), split and validate parts
  if (token.includes('-') || token.includes('/')) {
    const parts = token.split(/[-/]/).filter(Boolean);
    return parts.every((p) => isRecognizedToken(p));
  }

  const clean = token.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length === 0) return true;
  if (COMMON_VOCABULARY.has(clean) || VALID_NAME_EXCEPTIONS.has(clean)) return true;
  
  // Natural English words up to 5 characters with at least one vowel
  if (clean.length <= 5 && /[aeiouy]/.test(clean)) return true;

  // Check affix endings
  for (const suffix of COMMON_AFFIXES) {
    if (clean.endsWith(suffix) && clean.length > suffix.length + 1) return true;
  }

  // Any word containing at least one vowel and natural structure
  if (clean.length >= 6 && /[aeiouy]/.test(clean) && !/[bcdfghjklmnpqrstvwxz]{5,}/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Deterministic Gibberish & Quality Detector
 */
export function detectGibberish(text: string, fieldType: 'name' | 'goal' | 'description' | 'prompt'): { isGibberish: boolean; reason?: string } {
  if (!text || typeof text !== 'string') {
    return { isGibberish: true, reason: 'Field is empty or invalid.' };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { isGibberish: true, reason: 'Field contains only whitespace.' };
  }

  // Check keyboard sequence patterns
  const keyboardPatterns = [/qwerty/i, /asdfgh/i, /zxcvbn/i, /yuiop/i, /hjkl/i, /123456/i, /987654/i, /abcd/i];
  for (const pattern of keyboardPatterns) {
    if (pattern.test(trimmed)) {
      return { isGibberish: true, reason: 'Field contains keyboard sequence spam or random key patterns.' };
    }
  }

  // Check consecutive repeated characters (e.g., aaaaaaa, xxxxxxx)
  if (/(.)\1{4,}/i.test(trimmed)) {
    return { isGibberish: true, reason: 'Field contains excessive character repetition.' };
  }

  // Check repeated consecutive token spam (e.g. "abc abc abc")
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length >= 3) {
    let repeatCount = 1;
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i].toLowerCase() === tokens[i - 1].toLowerCase()) {
        repeatCount++;
        if (repeatCount >= 3) {
          return { isGibberish: true, reason: 'Field contains repeated nonsense word tokens.' };
        }
      } else {
        repeatCount = 1;
      }
    }
  }

  const alphasOnly = trimmed.replace(/[^a-zA-Z]/g, '');

  // ---------------- NAME FIELD VALIDATION ----------------
  if (fieldType === 'name') {
    if (alphasOnly.length < 2) {
      return { isGibberish: true, reason: 'Name is too short (must be at least 2 characters).' };
    }
    if (tokens.length > 6) {
      return { isGibberish: true, reason: 'Name contains too many words (maximum 6 allowed).' };
    }
    // Check invalid punctuation in name (allow hyphens, apostrophes, dots, colons, spaces)
    const cleanPunctuation = trimmed.replace(/[-' \.:]/g, '');
    if (/[!@#$%^&*()_+=~`{}\[\];<>,?\/|\\]/.test(cleanPunctuation)) {
      return { isGibberish: true, reason: 'Name contains invalid punctuation or random symbols.' };
    }

    // Single-word or short name vowel ratio check
    const vowels = (alphasOnly.match(/[aeiouyAEIOUY]/g) || []).length;
    const vowelRatio = vowels / alphasOnly.length;

    // Exception for recognized fantasy names
    const cleanName = alphasOnly.toLowerCase();
    if (VALID_NAME_EXCEPTIONS.has(cleanName)) {
      return { isGibberish: false };
    }

    if (alphasOnly.length >= 6 && vowelRatio < 0.18) {
      return { isGibberish: true, reason: `Name "${trimmed}" lacks a valid vowel-consonant structure.` };
    }

    // Check long consonant clusters per token (e.g., ccgucgusd has "ccg", "cgusd")
    for (const token of tokens) {
      const cleanTok = token.replace(/[^a-zA-Z]/g, '');
      if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(cleanTok) && !VALID_NAME_EXCEPTIONS.has(cleanTok.toLowerCase())) {
        return { isGibberish: true, reason: `Name "${trimmed}" contains unnatural consonant letter mashes.` };
      }
    }

    return { isGibberish: false };
  }

  // ---------------- LONGER TEXT FIELDS (Goal, Description, Prompt) ----------------
  const minCharLimit = fieldType === 'description' ? 15 : 12;
  const minWordLimit = fieldType === 'description' ? 3 : 2;

  if (trimmed.length < minCharLimit) {
    return { isGibberish: true, reason: `Field content is too short (minimum ${minCharLimit} characters required).` };
  }

  if (tokens.length < minWordLimit) {
    return { isGibberish: true, reason: `Field contains too few words (minimum ${minWordLimit} words required).` };
  }

  // Compute vowel ratio for longer text
  if (alphasOnly.length >= 15) {
    const vowels = (alphasOnly.match(/[aeiouyAEIOUY]/g) || []).length;
    const vowelRatio = vowels / alphasOnly.length;
    if (vowelRatio < 0.20 || vowelRatio > 0.85) {
      return { isGibberish: true, reason: 'Field text lacks a natural linguistic vowel-consonant structure.' };
    }
  }

  // Count words with 0 vowels (consonant-only words like sdvd, vnfdn, fhjbjh, bnmfd)
  let zeroVowelWords = 0;
  let recognizedCount = 0;

  for (const token of tokens) {
    const cleanWord = token.replace(/[^a-zA-Z]/g, '');
    if (cleanWord.length >= 3 && !/[aeiouyAEIOUY]/.test(cleanWord)) {
      zeroVowelWords++;
    }
    if (isRecognizedToken(cleanWord)) {
      recognizedCount++;
    }
  }

  // If over 30% of words contain 0 vowels (e.g. "sdvd vnfdn nb fhjbjh bjdb dfnbjh")
  if (tokens.length >= 4 && zeroVowelWords / tokens.length > 0.3) {
    return { isGibberish: true, reason: 'Field contains predominantly unpronounceable consonant letter sequences.' };
  }

  // Linguistic word recognition ratio
  const recognizedRatio = recognizedCount / tokens.length;
  if (tokens.length >= 4 && recognizedRatio < 0.35) {
    return { isGibberish: true, reason: 'Field contains random unmeaningful character sequences rather than coherent words.' };
  }

  return { isGibberish: false };
}

/**
 * Validates a Round 2 Submission across all required fields and stages
 */
export async function validateRound2Submission(sub: Round2Submission): Promise<SubmissionValidationResult> {
  const fieldDetails: Record<string, FieldValidationDetail> = {};
  const failureReasons: string[] = [];

  // Helper to validate single field
  const checkField = (
    value: string,
    fieldKey: string,
    label: string,
    type: 'name' | 'goal' | 'description' | 'prompt'
  ) => {
    const res = detectGibberish(value, type);
    if (res.isGibberish) {
      const reason = res.reason || `${label} is invalid or contains meaningless text.`;
      fieldDetails[fieldKey] = { field: fieldKey, label, valid: false, reason };
      failureReasons.push(`${label}: ${reason}`);
    } else {
      fieldDetails[fieldKey] = { field: fieldKey, label, valid: true, reason: 'Passes content quality check.' };
    }
  };

  // 1. HERO FIELDS VALIDATION
  checkField(sub.hero_data?.name, 'hero_name', 'Hero Name', 'name');
  checkField(sub.hero_data?.goal, 'hero_goal', 'Hero Goal', 'goal');
  checkField(sub.hero_data?.description, 'hero_description', 'Hero Character Description', 'description');
  checkField(sub.hero_prompt, 'hero_prompt', 'Hero Visual Prompt', 'prompt');

  // Hero Image Reference
  if (!sub.hero_image_s3_path || !isValidS3Path(sub.hero_image_s3_path)) {
    const reason = 'Hero Image S3 Path is invalid or missing standard submissions/ format.';
    fieldDetails['hero_image_s3_path'] = { field: 'hero_image_s3_path', label: 'Hero Image S3 Path', valid: false, reason };
    failureReasons.push(`Hero Image S3 Path: ${reason}`);
  } else {
    fieldDetails['hero_image_s3_path'] = { field: 'hero_image_s3_path', label: 'Hero Image S3 Path', valid: true, reason: 'S3 Path format verified.' };
  }

  // 2. VILLAIN FIELDS VALIDATION
  checkField(sub.villain_data?.name, 'villain_name', 'Villain Name', 'name');
  checkField(sub.villain_data?.goal, 'villain_goal', 'Villain Goal', 'goal');
  checkField(sub.villain_data?.description, 'villain_description', 'Villain Character Description', 'description');
  checkField(sub.villain_prompt, 'villain_prompt', 'Villain Visual Prompt', 'prompt');

  // Villain Image Reference
  if (!sub.villain_image_s3_path || !isValidS3Path(sub.villain_image_s3_path)) {
    const reason = 'Villain Image S3 Path is invalid or missing standard submissions/ format.';
    fieldDetails['villain_image_s3_path'] = { field: 'villain_image_s3_path', label: 'Villain Image S3 Path', valid: false, reason };
    failureReasons.push(`Villain Image S3 Path: ${reason}`);
  } else {
    fieldDetails['villain_image_s3_path'] = { field: 'villain_image_s3_path', label: 'Villain Image S3 Path', valid: true, reason: 'S3 Path format verified.' };
  }

  // 3. RELATIONSHIP & CONFLICT VALIDATION
  checkField(sub.hero_villain_relationship, 'relationship', 'Hero-Villain Relationship', 'description');
  checkField(sub.hero_villain_conflict, 'conflict', 'Hero-Villain Narrative Conflict', 'description');

  // 4. OVERALL RESULT DETERMINATION
  if (failureReasons.length > 0) {
    return {
      valid: false,
      status: 'INVALID_SUBMISSION',
      reason: `Submission failed content validation: ${failureReasons.slice(0, 2).join('; ')}`,
      fieldDetails,
      scoreCap: 0,
    };
  }

  // 5. CROSS-FIELD SEMANTIC CONSISTENCY WARNER
  let warningMsg = '';
  let scoreCap: number | undefined;

  const heroDesc = (sub.hero_data?.description || '').toLowerCase();
  const heroPrompt = (sub.hero_prompt || '').toLowerCase();

  // Mismatch check (e.g. soldier/warrior vs cartoon/cat)
  if (heroDesc.includes('soldier') || heroDesc.includes('warrior') || heroDesc.includes('armor')) {
    if (heroPrompt.includes('donut') || heroPrompt.includes('cartoon cat') || heroPrompt.includes('spaceship only')) {
      warningMsg = 'Cross-field inconsistency detected between character description and visual prompt.';
      scoreCap = 40;
    }
  }

  if (warningMsg) {
    return {
      valid: true,
      status: 'WARNING',
      reason: warningMsg,
      fieldDetails,
      scoreCap,
    };
  }

  return {
    valid: true,
    status: 'VALID',
    reason: 'All required submission fields cleared pre-scoring validation.',
    fieldDetails,
  };
}

/**
 * Validates a Round 1 Submission for meaningful content prior to locking
 */
export function validateRound1Submission(sub: Partial<Round1Submission>): SubmissionValidationResult {
  const fieldDetails: Record<string, FieldValidationDetail> = {};
  const failureReasons: string[] = [];

  const checkField = (
    value: string | undefined,
    fieldKey: string,
    label: string,
    type: 'name' | 'goal' | 'description' | 'prompt'
  ) => {
    const res = detectGibberish(value || '', type);
    if (res.isGibberish) {
      const reason = res.reason || `${label} contains invalid or meaningless content.`;
      fieldDetails[fieldKey] = { field: fieldKey, label, valid: false, reason };
      failureReasons.push(`${label}: ${reason}`);
    } else {
      fieldDetails[fieldKey] = { field: fieldKey, label, valid: true, reason: 'Passes content quality check.' };
    }
  };

  checkField(sub.franchise_name, 'franchise_name', 'Franchise Name', 'name');
  checkField(sub.genre, 'genre', 'Genre', 'name');
  checkField(sub.target_audience, 'target_audience', 'Target Audience', 'goal');
  checkField(sub.core_premise, 'core_premise', 'Core Premise', 'description');
  checkField(sub.central_conflict, 'central_conflict', 'Central Conflict', 'description');
  checkField(sub.world_concept, 'world_concept', 'World Concept', 'description');
  checkField(sub.elevator_pitch, 'elevator_pitch', 'Elevator Pitch', 'description');

  if (failureReasons.length > 0) {
    return {
      valid: false,
      status: 'INVALID_SUBMISSION',
      reason: `Round 1 failed validation: ${failureReasons.slice(0, 2).join('; ')}`,
      fieldDetails,
      scoreCap: 0,
    };
  }

  return {
    valid: true,
    status: 'VALID',
    reason: 'All required Round 1 fields passed content validation.',
    fieldDetails,
  };
}
