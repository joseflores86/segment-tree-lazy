# Segment Tree Lazy

A small, dependency-free segment tree with lazy propagation for range assignment and range queries over associative operations.

## Usage

```js
import { SegmentTree, rangeSum } from "./src/index.js";

const t = new SegmentTree(5, rangeSum, [1, 2, 3, 4, 5]);
console.log(t.query(0, 4)); // 15

t.update(1, 3, 10);        // assign 10 to indices 1..3
console.log(t.query(0, 4)); // 27
```

The exported names are `SegmentTree`, `rangeSum`, `rangeMin`, and `rangeMax`. `SegmentTree` is the class; the other three are operation presets you pass as the second constructor argument.

## Why this exists

The problem is the classic one: you have an array and you want to both update a contiguous range and query a contiguous range, many times, without degrading to O(n) per operation. A segment tree with lazy propagation gives O(log n) for both.

The deliberate trade-off is that this library only supports **range assignment** (set every element in [l, r] to a value), not range-add or range-multiply. Assignment has a trivially correct lazy-composition rule — a new assignment fully replaces any pending one — which keeps the push-down logic to a single line. Supporting additive updates on top of assignment would mean tracking two kinds of pending operations and their interaction; that is a different, more error-prone library.

## The awkward edge

The library uses a boolean `hasLazy` flag per node rather than a sentinel value to mark pending assignments. This matters because the assigned value can legitimately be `0` (the identity for sum), `-Infinity`, or any other number a sentinel might collide with. If you pass a custom operation whose identity is `0` but whose combine is not additive repetition, the aggregate computation for a range assignment will be wrong — the code assumes identity-0 means "sum-like". The three presets (`rangeSum`, `rangeMin`, `rangeMax`) are all safe. If you need a custom op with identity 0 that is not sum-like, do not use this library as-is.

Ranges are inclusive on both ends. `query(3, 1)` throws `RangeError`; it is not silently reordered.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

## Limitations

Values are coerced to floats, so very large integers lose precision. If you need
exact integer aggregates over a window, this is the wrong tool.

