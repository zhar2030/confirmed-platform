/**
 * Language detector for WhatsApp conversations.
 * Detects Arabic vs English without external dependencies.
 * Supports manual override mid-conversation.
 */

export type Lang = 'ar' | 'en';

// Arabic Unicode blocks (Standard + Extended + Presentation forms)
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Keywords that trigger a manual language switch
const EN_TRIGGERS = ['english', 'in english', 'switch to english', 'change to english', 'speak english', 'en'];
const AR_TRIGGERS = ['عربي', 'عربية', 'بالعربي', 'اللغة العربية', 'تكلم عربي', 'ar'];

/**
 * Detect if the message is a deliberate language-switch command.
 * Returns the desired language or null if not a switch command.
 */
export function isLanguageOverride(text: string): Lang | null {
  const lower = text.toLowerCase().trim();
  if (EN_TRIGGERS.some(t => lower === t || lower.startsWith(t + ' '))) return 'en';
  if (AR_TRIGGERS.some(t => text.includes(t))) return 'ar';
  return null;
}

/**
 * Detect the language of an arbitrary message.
 * Algorithm:
 *   1. Check override keywords first.
 *   2. Count Arabic vs Latin characters.
 *   3. Whichever is more → that language.
 *   4. Tie or ambiguous → Arabic (target market default).
 */
export function detectLanguage(text: string): Lang {
  const override = isLanguageOverride(text);
  if (override) return override;

  const chars = [...text.replace(/\s+/g, '')];
  if (chars.length === 0) return 'ar';

  let arabicCount = 0;
  let latinCount  = 0;

  for (const ch of chars) {
    if (ARABIC_RE.test(ch)) arabicCount++;
    else if (/[a-zA-Z]/.test(ch)) latinCount++;
  }

  // Pure numbers / emojis → default to Arabic
  if (arabicCount === 0 && latinCount === 0) return 'ar';
  // More Latin than Arabic → English
  if (latinCount > arabicCount) return 'en';
  return 'ar';
}

/** Localise a simple string based on lang. */
export function t(ar: string, en: string, lang: Lang): string {
  return lang === 'ar' ? ar : en;
}
