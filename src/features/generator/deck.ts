export interface DeckState {
  schemaVersion: 1;
  datasetHash: string;
  order: string[];
  cursor: number;
  previousCycleLastId: string | null;
  history: string[];
  updatedAt: number;
}

export const DECK_STORAGE_KEY = "bong:deck:v1";
const MAX_SERIALIZED_CHARACTERS = 65_536;
const STATE_KEYS = new Set([
  "schemaVersion",
  "datasetHash",
  "order",
  "cursor",
  "previousCycleLastId",
  "history",
  "updatedAt",
]);

function validateIds(ids: readonly string[]): Set<string> {
  if (ids.length === 0) throw new Error("The active idea deck is empty.");
  if (ids.length > 4000)
    throw new Error("The active idea deck exceeds the reviewed storage limit.");
  const unique = new Set(ids);
  if (unique.size !== ids.length)
    throw new Error("The active idea deck has duplicate IDs.");
  if (ids.some((id) => !/^BONG-\d{4}$/.test(id)))
    throw new Error("The active idea deck contains an invalid ID.");
  return unique;
}

function validState(
  value: unknown,
  ids: readonly string[],
  hash: string,
): value is DeckState {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const item = value as Record<string, unknown>;
  if (
    Object.keys(item).length !== STATE_KEYS.size ||
    Object.keys(item).some((key) => !STATE_KEYS.has(key))
  )
    return false;
  if (item.schemaVersion !== 1 || item.datasetHash !== hash) return false;
  if (
    !Array.isArray(item.order) ||
    item.order.length !== ids.length ||
    ids.length === 0
  )
    return false;
  const active = new Set(ids);
  if (
    active.size !== ids.length ||
    new Set(item.order).size !== ids.length ||
    item.order.some((id) => typeof id !== "string" || !active.has(id))
  )
    return false;
  if (
    typeof item.cursor !== "number" ||
    !Number.isInteger(item.cursor) ||
    item.cursor < 0 ||
    item.cursor > ids.length
  )
    return false;
  if (
    !Array.isArray(item.history) ||
    item.history.length > 20 ||
    item.history.some((id) => typeof id !== "string" || !active.has(id))
  )
    return false;
  if (
    item.previousCycleLastId !== null &&
    (typeof item.previousCycleLastId !== "string" ||
      !active.has(item.previousCycleLastId))
  )
    return false;
  if (
    typeof item.updatedAt !== "number" ||
    !Number.isSafeInteger(item.updatedAt) ||
    item.updatedAt <= 0 ||
    item.updatedAt > Date.now() + 60_000
  )
    return false;
  return true;
}

export function createDeck(
  ids: readonly string[],
  hash: string,
  rng = Math.random,
): DeckState {
  validateIds(ids);
  if (!/^[a-f0-9]{64}$/.test(hash))
    throw new Error("The dataset hash is invalid.");
  const order = [...ids];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const random = rng();
    if (!Number.isFinite(random) || random < 0 || random >= 1)
      throw new Error(
        "The random source must return a value from zero up to, but not including, one.",
      );
    const other = Math.floor(random * (index + 1));
    [order[index], order[other]] = [order[other]!, order[index]!];
  }
  return {
    schemaVersion: 1,
    datasetHash: hash,
    order,
    cursor: 0,
    previousCycleLastId: null,
    history: [],
    updatedAt: Date.now(),
  };
}

export function drawNext(
  state: DeckState,
  ids: readonly string[],
  hash: string,
  rng = Math.random,
): { id: string; state: DeckState } {
  let current = validState(state, ids, hash)
    ? state
    : createDeck(ids, hash, rng);
  if (current.cursor === current.order.length) {
    const previous = current.order[current.order.length - 1]!;
    const shuffled = createDeck(ids, hash, rng);
    if (shuffled.order.length > 1 && shuffled.order[0] === previous) {
      [shuffled.order[0], shuffled.order[1]] = [
        shuffled.order[1]!,
        shuffled.order[0]!,
      ];
    }
    current = {
      ...shuffled,
      previousCycleLastId: previous,
      history: [...current.history],
    };
  }
  const id = current.order[current.cursor]!;
  const cursor = current.cursor + 1;
  return {
    id,
    state: {
      ...current,
      order: [...current.order],
      cursor,
      previousCycleLastId:
        cursor === current.order.length ? id : current.previousCycleLastId,
      history: [...current.history, id].slice(-20),
      updatedAt: Date.now(),
    },
  };
}

export function restoreDeck(
  serialized: string | null,
  ids: readonly string[],
  hash: string,
): DeckState | null {
  if (
    typeof serialized !== "string" ||
    serialized.length > MAX_SERIALIZED_CHARACTERS
  )
    return null;
  try {
    const decoded: unknown = JSON.parse(serialized);
    return validState(decoded, ids, hash) ? decoded : null;
  } catch {
    return null;
  }
}
