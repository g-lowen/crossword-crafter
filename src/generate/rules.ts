/**
 * The rules "Generate solution" follows, kept apart from the search in `generate.ts` so they are
 * easy to change or add to. A rule can limit how one answer bends, ask something of the whole
 * solution, or only steer the choice between placements. When there is no solution, rules are
 * dropped in `DROP_ORDER` until there is one.
 */

export type RuleId =
  | 'min-crossings'
  | 'max-crossings'
  | 'connected'
  | 'inside-page'
  | 'bend-length'
  | 'max-bends'
  | 'bend-gap'
  | 'bend-ends'
  | 'bend-between-words'
  | 'bends-on-spaces'
  | 'touching'

export type Rule = {
  id: RuleId
  /** What the rule asks for, as shown when a solution had to break it. */
  text: string
  /** Every answer crosses at least this many other answers. */
  minCrossings?: number
  /** No answer has more than this many letters crossed. */
  maxCrossings?: number
  /** Every answer can be reached from every other by going from answer to crossing answer. */
  connected?: boolean
  /** Whether an answer with these characters may bend at these character indices, in order. */
  allowsBends?: (chars: string[], bends: number[]) => boolean
  /** Whether an answer with these characters may bend at this one character. */
  bendsAt?: (chars: string[], index: number) => boolean
  /**
   * Where answers may touch besides where they cross: nowhere, or where one ends against the side
   * of another that goes at right angles there. A thick border goes between answers that touch.
   */
  touching?: 'never' | 'end-on'
  /** A preference, never a reason to fail: higher is better. A crossing is worth 10. */
  bendScore?: (chars: string[], bends: number[]) => number
}

/** What Sammy can change about the rules, under the Generate solution button. */
export type GenerateSettings = {
  /** Answers only bend between words: on a space, a hyphen or a slash, or an apostrophe between words. */
  bendBetweenWordsOnly: boolean
  /** Every answer crosses at least this many other answers, or as many as it can. */
  minCrossings: number
  /** No answer has more letters crossed than this. Null for no limit. */
  maxCrossings: number | null
}

export const DEFAULT_GENERATE_SETTINGS: GenerateSettings = {
  bendBetweenWordsOnly: false,
  minCrossings: 2,
  maxCrossings: null,
}

/** The most crossings the settings offer, at least or at most. */
export const MAX_CROSSINGS_SETTING = 6

/** Answers this short never bend. */
const MAX_LENGTH_WITHOUT_BENDS = 4

/** The fewest characters from one bend to the next, and from a bend to either end. */
const MIN_BEND_GAP = 2

/** The most bends an answer may have: 1 below 6 characters, 2 below 12, then 3. */
export function maxBends(length: number): number {
  return length < 6 ? 1 : length < 12 ? 2 : 3
}

/** Characters that always come between two words. */
const WORD_BREAKS = new Set([' ', '-', '‐', '–', '—', '/'])

const APOSTROPHES = new Set(["'", '’', '‘', '`', '´'])

/**
 * Whether the character at `index` comes between two words, so bending there doesn't split a
 * word: a space, a hyphen or a slash. An apostrophe only counts with at least 2 letters before it
 * and 3 after it in the same word, as in ROCK'N'ROLL, and not in DON'T, YOU'RE, O'CONNOR or the N'
 * of GUNS N' ROSES, where the space is the break.
 */
export function isWordBreak(chars: string[], index: number): boolean {
  const char = chars[index]
  if (WORD_BREAKS.has(char)) return true
  if (!APOSTROPHES.has(char)) return false
  const letters = (from: number, step: number) => {
    let count = 0
    for (let i = from; i >= 0 && i < chars.length && !WORD_BREAKS.has(chars[i]); i += step) {
      if (/[\p{L}\p{N}]/u.test(chars[i])) count++
    }
    return count
  }
  return letters(index - 1, -1) >= 2 && letters(index + 1, 1) >= 3
}

/** The rules with Sammy's settings. Lengths count every character, spaces included. */
export function rulesFor(settings: GenerateSettings = DEFAULT_GENERATE_SETTINGS): Rule[] {
  const { minCrossings, maxCrossings, bendBetweenWordsOnly } = settings
  const others = (count: number) => `${count} ${count === 1 ? 'other' : 'others'}`
  const rules: (Rule | false)[] = [
    minCrossings > 0 && {
      id: 'min-crossings',
      text: `every answer crosses at least ${others(minCrossings)}`,
      minCrossings,
    },
    maxCrossings !== null && {
      id: 'max-crossings',
      text: `no answer is crossed more than ${maxCrossings === 1 ? 'once' : `${maxCrossings} times`}`,
      maxCrossings,
    },
    { id: 'connected', text: 'every answer is linked to the rest through crossings', connected: true },
    // The generator only places answers on the page, above the anagram bar when it's shown, so this
    // one needs no code here.
    { id: 'inside-page', text: 'every answer is inside the page' },
    {
      id: 'bend-length',
      // A bend can't be next to an end, so 4 characters leave no room for one anyway.
      text: `only answers over ${MAX_LENGTH_WITHOUT_BENDS} characters bend`,
      allowsBends: (chars, bends) => bends.length === 0 || chars.length > MAX_LENGTH_WITHOUT_BENDS,
    },
    {
      id: 'max-bends',
      text: 'at most 1 bend below 6 characters, 2 below 12 and 3 after that',
      allowsBends: (chars, bends) => bends.length <= maxBends(chars.length),
    },
    {
      id: 'bend-gap',
      text: `bends at least ${MIN_BEND_GAP} characters apart`,
      allowsBends: (_, bends) => bends.every((bend, i) => i === 0 || bend - bends[i - 1] >= MIN_BEND_GAP),
    },
    {
      id: 'bend-ends',
      text: 'no bend on the second or second to last character',
      // A bend there leaves a single letter sticking out.
      allowsBends: (chars, bends) =>
        bends.every((bend) => bend >= MIN_BEND_GAP && bend <= chars.length - 1 - MIN_BEND_GAP),
    },
    bendBetweenWordsOnly && { id: 'bend-between-words', text: 'answers only bend between words', bendsAt: isWordBreak },
    {
      id: 'bends-on-spaces',
      text: 'bends between words',
      // Every bend costs a little, so answers stay straight unless a bend wins a crossing or room,
      // and a bend between words costs less than one in a word.
      bendScore: (chars, bends) => -bends.reduce((cost, bend) => cost + (isWordBreak(chars, bend) ? 1 : 3), 0),
    },
    // Not one of the rules asked for at first, but without it answers end up side by side, reading
    // into each other.
    {
      id: 'touching',
      text: 'answers only touch where they cross, or where one ends against another',
      touching: 'end-on',
    },
  ]
  return rules.filter((rule) => rule !== false)
}

/** The rules with the default settings. */
export const RULES: Rule[] = rulesFor()

/**
 * The order rules are dropped in when there is no solution, the most restrictive first. Each
 * stays dropped while the next one goes. Rules not listed always hold. The limits Sammy can add in
 * the settings go last.
 */
export const DROP_ORDER: RuleId[] = [
  'min-crossings',
  'touching',
  'connected',
  'max-bends',
  'bend-gap',
  'bend-ends',
  'bend-length',
  'max-crossings',
  'bend-between-words',
]
