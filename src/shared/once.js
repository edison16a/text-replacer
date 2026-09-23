/**
 * Runs an async factory at most once, and remembers the promise rather than
 * the result.
 *
 * Two hazards this exists for, both of which the extension currently has.
 *
 * Caching the resolved value instead of the promise does not actually
 * serialise anything. Two callers arriving while the first call is still in
 * flight both find nothing cached and both run the factory, which is fine for
 * a pure read and badly wrong for anything that creates a resource. Caching
 * the promise means the second caller waits on the first one's work.
 *
 * Caching the promise on its own has the opposite problem: a single failure is
 * remembered forever, so one bad read poisons every later one. The cache is
 * cleared when the promise rejects, which leaves a retry possible without
 * losing the deduplication that matters while a call is in flight.
 *
 * @template T
 * @param {() => Promise<T> | T} factory Work to run once. May throw synchronously.
 * @returns {() => Promise<T>} Call as often as you like.
 */
export function once(factory) {
  /** @type {Promise<T> | null} */
  let pending = null;

  return () => {
    if (!pending) {
      // Promise.resolve().then() rather than factory() directly, so a factory
      // that throws synchronously rejects the promise instead of escaping and
      // leaving the cache holding nothing.
      pending = Promise.resolve()
        .then(factory)
        .catch((error) => {
          pending = null;
          throw error;
        });
    }
    return pending;
  };
}
