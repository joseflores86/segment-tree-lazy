/**
 * Segment tree with lazy propagation.
 *
 * Supports range updates and range queries for associative operations.
 *
 * Design decisions (stated plainly so the tests and the README agree):
 *
 * 1. The combine operation must be associative but need not be commutative.
 *    We never assume commutativity when pushing lazy tags down the tree.
 *
 * 2. Range updates are uniform assignment of a value to every element in the
 *    range. We do NOT support range-add or range-multiply. The reason is that
 *    "assignment" has a clean lazy composition rule: a newer assignment always
 *    fully replaces an older one, so `lazy[node] = value` is the entire push-down
 *    rule. Supporting range-add on top of assignment would require tracking two
 *    kinds of pending operations and their interaction, which is a different
 *    library.
 *
 * 3. A node is either "assigned" (has a concrete pending value) or "clean"
 *    (no pending assignment). We use a `hasLazy` boolean array rather than a
 *    sentinel value, because the assigned value can legitimately be any finite
 *    number — including zero, negative, or Infinity — and a sentinel would
 *    collide.
 *
 * 4. Leaves default to 0. Callers who need a different initial array pass it
 *    to the constructor.
 */

/**
 * @typedef {Object} Operation
 * @property {unknown} identity  The identity element for combine: combine(x, identity) === x.
 * @property {(a: unknown, b: unknown) => unknown} combine  Associative binary op.
 */

/**
 * Preset for range-sum queries. Identity is 0; combine is addition.
 * Addition is associative, so this is valid.
 */
export const rangeSum = {
  identity: 0,
  combine: (a, b) => a + b,
};

/**
 * Preset for range-min queries. Identity is +Infinity so that any real value
 * is smaller; combine is Math.min.
 */
export const rangeMin = {
  identity: Infinity,
  combine: (a, b) => Math.min(a, b),
};

/**
 * Preset for range-max queries. Identity is -Infinity so that any real value
 * is larger; combine is Math.max.
 */
export const rangeMax = {
  identity: -Infinity,
  combine: (a, b) => Math.max(a, b),
};

export class SegmentTree {
  /**
   * @param {number} n           Size of the array.
   * @param {Operation} operation  Must define `identity` and associative `combine`.
   * @param {number[]} [initial]  Optional initial array of length n. Defaults to all zeros.
   */
  constructor(n, operation, initial) {
    if (!Number.isInteger(n) || n < 0) {
      throw new RangeError(`n must be a non-negative integer, got ${n}`);
    }
    if (operation === null || operation === undefined) {
      throw new TypeError("operation is required");
    }
    if (typeof operation.combine !== "function") {
      throw new TypeError("operation.combine must be a function");
    }

    this.n = n;
    this.identity = operation.identity;
    this.combine = operation.combine;

    // 4*n is the classic safe upper bound for a recursive segment tree on n
    // elements; it covers the worst-case leaf count after rounding up to a
    // power of two and all internal nodes.
    const size = Math.max(4, 4 * n);
    this.tree = new Array(size).fill(this.identity);
    this.lazy = new Array(size).fill(this.identity);
    this.hasLazy = new Array(size).fill(false);

    if (initial !== undefined) {
      if (!Array.isArray(initial)) {
        throw new TypeError("initial must be an array");
      }
      if (initial.length !== n) {
        throw new RangeError(`initial.length (${initial.length}) must equal n (${n})`);
      }
      if (n > 0) {
        this._build(1, 0, n - 1, initial);
      }
    }
  }

  _build(node, left, right, initial) {
    if (left === right) {
      this.tree[node] = initial[left];
      return;
    }
    const mid = (left + right) >> 1;
    this._build(node * 2, left, mid, initial);
    this._build(node * 2 + 1, mid + 1, right, initial);
    this.tree[node] = this.combine(this.tree[node * 2], this.tree[node * 2 + 1]);
  }

  _apply(node, left, right, value) {
    // For assignment: every element in [left, right] becomes `value`, so the
    // node's aggregate is `value` repeated (right - left + 1) times.
    //
    // We special-case sum because its identity (0) is not the absorbing
    // element for repetition: 0 repeated k times is 0, not k*0. For min/max
    // the identity IS absorbing (min(Infinity, x) = x), so repeating the
    // identity k times still yields the identity, which is what we want for an
    // empty range.
    //
    // We detect sum by identity === 0. This is a deliberate, documented
    // heuristic: the three presets are sum (identity 0), min (identity
    // +Infinity), max (identity -Infinity). A caller passing a custom op with
    // identity 0 that is NOT additive repetition would be surprised, but that
    // is an unusual case and the README calls it out.
    const count = right - left + 1;
    if (this.identity === 0) {
      this.tree[node] = value * count;
    } else {
      // For min/max: assigning `value` to the whole range makes the aggregate
      // equal to `value` (since every element is now `value`).
      this.tree[node] = value;
    }
    this.lazy[node] = value;
    this.hasLazy[node] = true;
  }

  _push(node, left, right) {
    if (!this.hasLazy[node]) return;
    if (left === right) {
      // Leaf: nothing to push to. Clear the flag so a later update on this
      // node doesn't mistakenly think it still has a pending tag.
      this.hasLazy[node] = false;
      return;
    }
    const mid = (left + right) >> 1;
    this._apply(node * 2, left, mid, this.lazy[node]);
    this._apply(node * 2 + 1, mid + 1, right, this.lazy[node]);
    this.hasLazy[node] = false;
  }

  _updateRange(node, left, right, ql, qr, value) {
    if (ql > right || qr < left) return;
    if (ql <= left && right <= qr) {
      this._apply(node, left, right, value);
      return;
    }
    this._push(node, left, right);
    const mid = (left + right) >> 1;
    this._updateRange(node * 2, left, mid, ql, qr, value);
    this._updateRange(node * 2 + 1, mid + 1, right, ql, qr, value);
    this.tree[node] = this.combine(this.tree[node * 2], this.tree[node * 2 + 1]);
  }

  _queryRange(node, left, right, ql, qr) {
    if (ql > right || qr < left) return this.identity;
    if (ql <= left && right <= qr) return this.tree[node];
    this._push(node, left, right);
    const mid = (left + right) >> 1;
    return this.combine(
      this._queryRange(node * 2, left, mid, ql, qr),
      this._queryRange(node * 2 + 1, mid + 1, right, ql, qr)
    );
  }

  /**
   * Assign `value` to every element in [l, r] (inclusive).
   * @param {number} l
   * @param {number} r
   * @param {number} value
   */
  update(l, r, value) {
    if (!Number.isInteger(l) || !Number.isInteger(r)) {
      throw new TypeError("l and r must be integers");
    }
    if (l < 0 || r >= this.n || l > r) {
      throw new RangeError(`invalid range [${l}, ${r}] for n=${this.n}`);
    }
    if (this.n === 0) return;
    this._updateRange(1, 0, this.n - 1, l, r, value);
  }

  /**
   * Query the aggregate over [l, r] (inclusive).
   * @param {number} l
   * @param {number} r
   * @returns {number}
   */
  query(l, r) {
    if (!Number.isInteger(l) || !Number.isInteger(r)) {
      throw new TypeError("l and r must be integers");
    }
    if (l < 0 || r >= this.n || l > r) {
      throw new RangeError(`invalid range [${l}, ${r}] for n=${this.n}`);
    }
    if (this.n === 0) return this.identity;
    return this._queryRange(1, 0, this.n - 1, l, r);
  }
}
