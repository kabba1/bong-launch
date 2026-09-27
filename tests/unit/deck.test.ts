import { describe, expect, it } from "vitest";
import {
  createDeck,
  drawNext,
  restoreDeck,
} from "../../src/features/generator/deck";

const ids = Array.from(
  { length: 1000 },
  (_, index) => `BONG-${String(index + 1).padStart(4, "0")}`,
);
const hash = "a".repeat(64);
const rng = () => 0.25;

describe("generator deck (GEN-01/02/03/05/07/12)", () => {
  it("draws every supplied ID once then starts a cycle without an immediate repeat", () => {
    let state = createDeck(ids, hash, rng);
    const drawn: string[] = [];
    for (let index = 0; index < 1000; index += 1) {
      const result = drawNext(state, ids, hash, rng);
      drawn.push(result.id);
      state = result.state;
    }
    expect(new Set(drawn).size).toBe(1000);
    expect([...drawn].sort()).toEqual(ids);
    const next = drawNext(state, ids, hash, rng);
    expect(next.id).not.toBe(drawn.at(-1));
    expect(next.state.cursor).toBe(1);
    expect(next.state.history).toHaveLength(20);
  });

  it("does not mutate the old state and persists only bounded IDs", () => {
    const initial = createDeck(ids, hash, rng);
    const original = structuredClone(initial);
    const result = drawNext(initial, ids, hash, rng);
    expect(initial).toEqual(original);
    expect(result.state.cursor).toBe(1);
    expect(result.state.history).toEqual([result.id]);
    expect(restoreDeck(JSON.stringify(result.state), ids, hash)).toEqual(
      result.state,
    );
  });

  it("handles an empty deck deliberately and permits a single idea across cycles", () => {
    expect(() => createDeck([], hash)).toThrow(/empty/i);
    let state = createDeck(["BONG-0001"], hash, rng);
    for (let index = 0; index < 3; index += 1) {
      const result = drawNext(state, ["BONG-0001"], hash, rng);
      expect(result.id).toBe("BONG-0001");
      state = result.state;
    }
  });

  it("rejects corrupt, obsolete, oversized, unknown, or duplicate persisted data", () => {
    const good = createDeck(ids, hash, rng);
    const malformed = [
      null,
      "",
      "{",
      "x".repeat(65537),
      JSON.stringify({ ...good, datasetHash: "b".repeat(64) }),
      JSON.stringify({ ...good, cursor: -1 }),
      JSON.stringify({ ...good, cursor: 1001 }),
      JSON.stringify({ ...good, cursor: 0.5 }),
      JSON.stringify({ ...good, order: good.order.map(() => ids[0]) }),
      JSON.stringify({ ...good, history: ["../../unknown"] }),
      JSON.stringify({ ...good, history: Array(21).fill(ids[0]) }),
      JSON.stringify({ ...good, updatedAt: "yesterday" }),
      JSON.stringify({ ...good, previousCycleLastId: "unknown" }),
    ];
    for (const value of malformed)
      expect(restoreDeck(value, ids, hash)).toBeNull();
    expect(restoreDeck(JSON.stringify(good), ids.slice(1), hash)).toBeNull();
  });

  it("resets a stale in-memory state using the new active corpus", () => {
    const initial = createDeck(ids, hash, rng);
    const result = drawNext(initial, ["BONG-1000"], "b".repeat(64), rng);
    expect(result.id).toBe("BONG-1000");
    expect(result.state.datasetHash).toBe("b".repeat(64));
  });

  it("rejects invalid random sources and duplicate active IDs", () => {
    expect(() => createDeck(ids, hash, () => 1)).toThrow(/random/i);
    expect(() => createDeck(ids, hash, () => Number.NaN)).toThrow(/random/i);
    expect(() => createDeck(["same", "same"], hash, rng)).toThrow(/duplicate/i);
  });
});
