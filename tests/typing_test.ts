import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  BASE_MS_PER_CHAR,
  BASE_WPM,
  BLOG_WPM,
  BONUS_DIFFERENT_HAND,
  HELD_PINKY_DISCOUNT,
  KEY_MAP,
  MOD_COST_OPTION,
  MOD_COST_OPTION_SHIFT,
  MOD_COST_SHIFT,
  PENALTY_SAME_CHAR,
  PENALTY_SAME_FINGER,
  RARITY_PENALTY,
  charDelayMs,
  lookup,
  wordDurationMs,
  wpmMultiplier,
} from "../website/src/typing.ts";

describe("key map integrity", () => {
  it("maps every a-z lowercase letter", () => {
    for (const ch of "abcdefghijklmnopqrstuvwxyz") {
      assert.ok(KEY_MAP[ch], `missing lowercase ${ch}`);
      assert.equal(KEY_MAP[ch]!.modifiers.length, 0, `${ch} should be unmodified`);
    }
  });

  it("maps every A-Z uppercase letter with Shift", () => {
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const info = KEY_MAP[ch];
      assert.ok(info, `missing uppercase ${ch}`);
      assert.deepEqual(info!.modifiers, ["shift"], `${ch} should require Shift`);
    }
  });

  it("maps every digit 0-9 without modifiers", () => {
    for (const ch of "0123456789") {
      assert.ok(KEY_MAP[ch], `missing digit ${ch}`);
      assert.equal(KEY_MAP[ch]!.modifiers.length, 0);
    }
  });

  it("maps Swedish letters on the right pinky / ring", () => {
    assert.deepEqual(lookup("å"), { hand: "R", finger: "pinky", modifiers: [] });
    assert.deepEqual(lookup("ö"), { hand: "R", finger: "pinky", modifiers: [] });
    assert.deepEqual(lookup("ä"), { hand: "R", finger: "pinky", modifiers: [] });
    assert.deepEqual(lookup("Å"), { hand: "R", finger: "pinky", modifiers: ["shift"] });
    assert.deepEqual(lookup("Ä"), { hand: "R", finger: "pinky", modifiers: ["shift"] });
    assert.deepEqual(lookup("Ö"), { hand: "R", finger: "pinky", modifiers: ["shift"] });
  });

  it("spot-checks home-row assignments", () => {
    assert.deepEqual(lookup("f"), { hand: "L", finger: "index", modifiers: [] });
    assert.deepEqual(lookup("j"), { hand: "R", finger: "index", modifiers: [] });
    assert.deepEqual(lookup("A"), { hand: "L", finger: "pinky", modifiers: ["shift"] });
    assert.equal(lookup(" ")!.finger, "thumb");
  });

  it("marks rare and Option-combo symbols", () => {
    assert.deepEqual(lookup("@"), { hand: "L", finger: "ring", modifiers: ["option"] });
    const bracketL = lookup("[");
    assert.ok(bracketL);
    assert.deepEqual(bracketL!.modifiers, ["option"]);
    assert.equal(bracketL!.rare, true);
    const brace = lookup("{");
    assert.ok(brace);
    assert.deepEqual([...brace!.modifiers].sort(), ["option", "shift"]);
    assert.equal(brace!.rare, true);
  });

  it("returns null for characters outside the layout", () => {
    assert.equal(lookup("é"), null);
    assert.equal(lookup("🙂"), null);
  });
});

describe("wpmMultiplier", () => {
  it("returns 1 at the base WPM", () => {
    assert.equal(wpmMultiplier(BASE_WPM), 1);
  });

  it("halves at 200 WPM and doubles at 50 WPM", () => {
    assert.equal(wpmMultiplier(200), 0.5);
    assert.equal(wpmMultiplier(50), 2);
  });
});

describe("charDelayMs base penalties at 100 WPM", () => {
  it("baseline for the first character", () => {
    assert.equal(charDelayMs(null, "a"), 120);
    assert.equal(BASE_MS_PER_CHAR, 120);
  });

  it("same character is slower (×1.5)", () => {
    assert.equal(charDelayMs("e", "e"), Math.round(120 * PENALTY_SAME_CHAR));
  });

  it("same finger different key is slower (×1.3)", () => {
    assert.equal(charDelayMs("r", "t"), Math.round(120 * PENALTY_SAME_FINGER));
  });

  it("same hand different finger is neutral", () => {
    assert.equal(charDelayMs("e", "r"), 120);
  });

  it("hand alternation is faster (×0.85)", () => {
    assert.equal(charDelayMs("f", "j"), Math.round(120 * BONUS_DIFFERENT_HAND));
  });

  it("unknown character falls back to baseline", () => {
    assert.equal(charDelayMs(null, "é"), 120);
  });
});

describe("charDelayMs modifier and rarity costs at 100 WPM", () => {
  it("uppercase letter carries Shift cost", () => {
    assert.equal(charDelayMs(null, "A"), Math.round(120 * MOD_COST_SHIFT));
  });

  it("Option-combo @ is expensive", () => {
    assert.equal(charDelayMs(null, "@"), Math.round(120 * MOD_COST_OPTION));
  });

  it("rare Option-combo [ stacks rarity penalty", () => {
    assert.equal(charDelayMs(null, "["), Math.round(120 * MOD_COST_OPTION * RARITY_PENALTY));
  });

  it("rare Option+Shift { is the slowest class", () => {
    assert.equal(charDelayMs(null, "{"), Math.round(120 * MOD_COST_OPTION_SHIFT * RARITY_PENALTY));
  });

  it("held-pinky discount for same-hand shifted sequences", () => {
    // "A" and "S" are both left-hand shifted letters; pinky stays on Shift.
    const got = charDelayMs("A", "S");
    const want = Math.round(120 * 1.0 * MOD_COST_SHIFT * HELD_PINKY_DISCOUNT);
    assert.equal(got, want);
  });

  it("no held-pinky discount when shifted letters swap hands", () => {
    // "A" (L-pinky) then "K" (R-middle) — the typist swaps Shift pinkies.
    const got = charDelayMs("A", "K");
    const want = Math.round(120 * BONUS_DIFFERENT_HAND * MOD_COST_SHIFT);
    assert.equal(got, want);
  });
});

describe("WPM scaling", () => {
  it("scales delays by the inverse of WPM", () => {
    assert.equal(charDelayMs(null, "a", 200), 60);
    assert.equal(charDelayMs(null, "a", 50), 240);
  });

  it("applies scale after penalties", () => {
    const at100 = charDelayMs("e", "e", 100);
    const at118 = charDelayMs("e", "e", 118);
    assert.equal(at118, Math.round(at100 * (100 / 118)));
  });
});

describe("wordDurationMs invariants", () => {
  it("matches the hand-summed per-char delays for 'free'", () => {
    const word = "free";
    let prev: string | null = null;
    let sum = 0;
    for (const ch of word) {
      sum += charDelayMs(prev, ch);
      prev = ch;
    }
    assert.equal(wordDurationMs(word), sum);
  });

  it("'aaaa' is slower than 'abab' at every WPM we care about", () => {
    for (const wpm of [50, 100, 118, 200]) {
      assert.ok(
        wordDurationMs("aaaa", wpm) > wordDurationMs("abab", wpm),
        `expected aaaa > abab at ${wpm} WPM`,
      );
    }
  });

  it("capitalization costs extra", () => {
    assert.ok(wordDurationMs("The") > wordDurationMs("the"));
  });

  it("Option symbols cost more than plain letters", () => {
    assert.ok(wordDurationMs("@foo") > wordDurationMs("afoo"));
  });

  it("rare Option+Shift braces cost more than plain Shift parens", () => {
    assert.ok(wordDurationMs("{foo}") > wordDurationMs("(foo)"));
  });

  it("rare Option-combo brackets cost more than non-rare Option @", () => {
    assert.ok(wordDurationMs("[abc]") > wordDurationMs("@abc@"));
  });

  it("every character of a mixed sample returns a finite positive integer", () => {
    const sample = "The quick brown räv jumps over 123 {lazy} [dogs] — @home!";
    let prev: string | null = null;
    for (const ch of sample) {
      const d = charDelayMs(prev, ch, BLOG_WPM);
      assert.ok(Number.isFinite(d));
      assert.ok(d > 0);
      assert.equal(d, Math.floor(d));
      prev = ch;
    }
  });
});
