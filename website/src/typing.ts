export type Hand = "L" | "R";
export type Finger = "pinky" | "ring" | "middle" | "index" | "thumb";
export type Modifier = "shift" | "option";

export interface KeyInfo {
  hand: Hand;
  finger: Finger;
  modifiers: readonly Modifier[];
  rare?: boolean;
}

export const BASE_WPM = 100;
export const BASE_MS_PER_CHAR = 60_000 / (BASE_WPM * 5);

export const BLOG_WPM = 118;

export const PENALTY_SAME_CHAR = 1.5;
export const PENALTY_SAME_FINGER = 1.3;
export const PENALTY_SAME_HAND = 1.0;
export const BONUS_DIFFERENT_HAND = 0.85;
export const PENALTY_UNKNOWN = 1.0;

export const MOD_COST_NONE = 1.0;
export const MOD_COST_SHIFT = 1.4;
export const MOD_COST_OPTION = 2.5;
export const MOD_COST_OPTION_SHIFT = 3.5;

export const RARITY_PENALTY = 1.5;
export const HELD_PINKY_DISCOUNT = 0.8;

function k(hand: Hand, finger: Finger, modifiers: readonly Modifier[] = [], rare = false): KeyInfo {
  return rare ? { hand, finger, modifiers, rare } : { hand, finger, modifiers };
}

// Swedish Mac (ISO) layout. Each entry maps a visible character to the finger
// that presses its base key, plus any modifier(s) required to produce it.
export const KEY_MAP: Record<string, KeyInfo> = {
  // L-pinky
  "§": k("L", "pinky", [], true),
  "1": k("L", "pinky"),
  q: k("L", "pinky"),
  a: k("L", "pinky"),
  z: k("L", "pinky"),
  "<": k("L", "pinky"),
  // L-ring
  "2": k("L", "ring"),
  w: k("L", "ring"),
  s: k("L", "ring"),
  x: k("L", "ring"),
  // L-middle
  "3": k("L", "middle"),
  e: k("L", "middle"),
  d: k("L", "middle"),
  c: k("L", "middle"),
  // L-index
  "4": k("L", "index"),
  "5": k("L", "index"),
  r: k("L", "index"),
  t: k("L", "index"),
  f: k("L", "index"),
  g: k("L", "index"),
  v: k("L", "index"),
  b: k("L", "index"),
  // R-index
  "6": k("R", "index"),
  "7": k("R", "index"),
  y: k("R", "index"),
  u: k("R", "index"),
  h: k("R", "index"),
  j: k("R", "index"),
  n: k("R", "index"),
  m: k("R", "index"),
  // R-middle
  "8": k("R", "middle"),
  i: k("R", "middle"),
  k: k("R", "middle"),
  ",": k("R", "middle"),
  // R-ring
  "9": k("R", "ring"),
  o: k("R", "ring"),
  l: k("R", "ring"),
  ".": k("R", "ring"),
  // R-pinky (unmodified)
  "0": k("R", "pinky"),
  "+": k("R", "pinky"),
  "´": k("R", "pinky", [], true),
  å: k("R", "pinky"),
  "¨": k("R", "pinky", [], true),
  ö: k("R", "pinky"),
  ä: k("R", "pinky"),
  "-": k("R", "pinky"),
  // Thumb
  " ": k("L", "thumb"),
};

// Shifted number row.
const SHIFT_NUMBER_ROW: Record<string, KeyInfo> = {
  "°": k("L", "pinky", ["shift"], true),
  "!": k("L", "pinky", ["shift"]),
  '"': k("L", "ring", ["shift"]),
  "#": k("L", "middle", ["shift"]),
  "¤": k("L", "index", ["shift"], true),
  "%": k("L", "index", ["shift"]),
  "&": k("R", "index", ["shift"]),
  "/": k("R", "index", ["shift"]),
  "(": k("R", "middle", ["shift"]),
  ")": k("R", "ring", ["shift"]),
  "=": k("R", "pinky", ["shift"]),
  "?": k("R", "pinky", ["shift"]),
  "`": k("R", "pinky", ["shift"], true),
};
Object.assign(KEY_MAP, SHIFT_NUMBER_ROW);

// Shifted bottom row and other punctuation.
const SHIFT_PUNCT: Record<string, KeyInfo> = {
  ";": k("R", "middle", ["shift"]),
  ":": k("R", "ring", ["shift"]),
  _: k("R", "pinky", ["shift"]),
  ">": k("L", "pinky", ["shift"]),
  "*": k("R", "pinky", ["shift"], true),
  "^": k("R", "pinky", ["shift"], true),
};
Object.assign(KEY_MAP, SHIFT_PUNCT);

// Uppercase letters: same finger/hand as lowercase, plus Shift.
const LOWER_TO_UPPER: Array<[string, string]> = [
  ["a", "A"],
  ["b", "B"],
  ["c", "C"],
  ["d", "D"],
  ["e", "E"],
  ["f", "F"],
  ["g", "G"],
  ["h", "H"],
  ["i", "I"],
  ["j", "J"],
  ["k", "K"],
  ["l", "L"],
  ["m", "M"],
  ["n", "N"],
  ["o", "O"],
  ["p", "P"],
  ["q", "Q"],
  ["r", "R"],
  ["s", "S"],
  ["t", "T"],
  ["u", "U"],
  ["v", "V"],
  ["w", "W"],
  ["x", "X"],
  ["y", "Y"],
  ["z", "Z"],
  ["å", "Å"],
  ["ä", "Ä"],
  ["ö", "Ö"],
];
// R-pinky for p is not yet in the base map — add it, then derive capitals.
KEY_MAP.p = k("R", "pinky");
for (const [lo, up] of LOWER_TO_UPPER) {
  const base = KEY_MAP[lo];
  if (!base) continue;
  KEY_MAP[up] = { hand: base.hand, finger: base.finger, modifiers: ["shift"] };
}

// Mac Option-combos. Option itself is pressed with a thumb; the finger/hand
// recorded here is the one that strikes the letter key.
const OPTION_KEYS: Record<string, KeyInfo> = {
  "@": k("L", "ring", ["option"]),
  "£": k("L", "middle", ["option"]),
  $: k("L", "index", ["option"]),
  "€": k("L", "middle", ["option", "shift"]),
  "|": k("R", "index", ["option"], true),
  "[": k("R", "middle", ["option"], true),
  "]": k("R", "ring", ["option"], true),
  "~": k("R", "pinky", ["option"], true),
  "{": k("R", "middle", ["option", "shift"], true),
  "}": k("R", "ring", ["option", "shift"], true),
  "\\": k("R", "index", ["option", "shift"], true),
};
Object.assign(KEY_MAP, OPTION_KEYS);

export function lookup(ch: string): KeyInfo | null {
  return KEY_MAP[ch] ?? null;
}

export function wpmMultiplier(wpm: number): number {
  return BASE_WPM / wpm;
}

function hasShift(info: KeyInfo): boolean {
  return info.modifiers.includes("shift");
}

function hasOption(info: KeyInfo): boolean {
  return info.modifiers.includes("option");
}

function modifierCost(info: KeyInfo): number {
  const shift = hasShift(info);
  const option = hasOption(info);
  if (option && shift) return MOD_COST_OPTION_SHIFT;
  if (option) return MOD_COST_OPTION;
  if (shift) return MOD_COST_SHIFT;
  return MOD_COST_NONE;
}

function basePenalty(
  prev: string | null,
  curr: string,
  prevInfo: KeyInfo | null,
  info: KeyInfo,
): number {
  if (prev === null || prevInfo === null) return 1.0;
  if (prev === curr) return PENALTY_SAME_CHAR;
  if (prevInfo.finger === info.finger && prevInfo.hand === info.hand) return PENALTY_SAME_FINGER;
  if (prevInfo.hand === info.hand) return PENALTY_SAME_HAND;
  return BONUS_DIFFERENT_HAND;
}

export function charDelayMs(prev: string | null, curr: string, wpm: number = BASE_WPM): number {
  const scale = wpmMultiplier(wpm);
  const info = lookup(curr);
  if (info === null) {
    return Math.round(BASE_MS_PER_CHAR * PENALTY_UNKNOWN * scale);
  }
  const prevInfo = prev !== null ? lookup(prev) : null;
  const base = basePenalty(prev, curr, prevInfo, info);
  let mod = modifierCost(info);
  if (
    hasShift(info) &&
    !hasOption(info) &&
    prevInfo &&
    hasShift(prevInfo) &&
    !hasOption(prevInfo) &&
    prevInfo.hand === info.hand
  ) {
    mod *= HELD_PINKY_DISCOUNT;
  }
  const rarity = info.rare ? RARITY_PENALTY : 1.0;
  return Math.round(BASE_MS_PER_CHAR * base * mod * rarity * scale);
}

export function wordDurationMs(text: string, wpm: number = BASE_WPM): number {
  let total = 0;
  let prev: string | null = null;
  for (const ch of text) {
    total += charDelayMs(prev, ch, wpm);
    prev = ch;
  }
  return total;
}
