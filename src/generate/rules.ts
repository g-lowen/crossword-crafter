/**
 * The rules "Generate solution" follows, kept apart from the search in `generate.ts` so they are
 * easy to change or add to. A rule can limit how one answer bends, ask something of the whole
 * solution, or only steer the choice between placements. When there is no solution, rules are
 * dropped in `DROP_ORDER` until there is one.
 */

export type RuleId =
  | 'cross-two'
  | 'connected'
  | 'inside-page'
  | 'bend-length'
  | 'max-bends'
  | 'bend-gap'
  | 'bend-ends'
  | 'bends-on-spaces'
  | 'touching'

export type Rule = {
  id: RuleId
  /** What the rule asks for, as shown when a solution had to break it. */
  text: string
  /** Every answer crosses at least this many other answers. */
  minCrossings?: number
  /** Every answer can be reached from every other by going from answer to crossing answer. */
  connected?: boolean
  /** Whether an answer with these characters may bend at these character indices, in order. */
  allowsBends?: (chars: string[], bends: number[]) => boolean
  /**
   * Where answers may touch besides where they cross: nowhere, or where one ends against the side
   * of another that goes at right angles there. A thick border goes between answers that touch.
   */
  touching?: 'never' | 'end-on'
  /** A preference, never a reason to fail: higher is better. A crossing is worth 10. */
  bendScore?: (chars: string[], bends: number[]) => number
}

/** Answers this short never bend. */
const MAX_LENGTH_WITHOUT_BENDS = 4

/** The fewest characters from one bend to the next, and from a bend to either end. */
const MIN_BEND_GAP = 2

/** The most bends an answer may have: 1 below 6 characters, 2 below 12, then 3. */
export function maxBends(length: number): number {
  return length < 6 ? 1 : length < 12 ? 2 : 3
}

/** Lengths count every character, spaces included. */
export const RULES: Rule[] = [
  { id: 'cross-two', text: 'every answer crosses at least two others', minCrossings: 2 },
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
  {
    id: 'bends-on-spaces',
    text: 'bends on spaces',
    // Every bend costs a little, so answers stay straight unless a bend wins a crossing or room,
    // and a bend on a space costs less than one on a letter.
    bendScore: (chars, bends) => -bends.reduce((cost, bend) => cost + (chars[bend] === ' ' ? 1 : 3), 0),
  },
  // Not one of the rules asked for at first, but without it answers end up side by side, reading
  // into each other.
  {
    id: 'touching',
    text: 'answers only touch where they cross, or where one ends against another',
    touching: 'end-on',
  },
]

/**
 * The order rules are dropped in when there is no solution, the most restrictive first. Each
 * stays dropped while the next one goes. Rules not listed always hold.
 */
export const DROP_ORDER: RuleId[] = [
  'cross-two',
  'touching',
  'connected',
  'max-bends',
  'bend-gap',
  'bend-ends',
  'bend-length',
]
