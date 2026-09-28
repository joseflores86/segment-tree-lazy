import { test } from "node:test";
import assert from "node:assert/strict";
import { SegmentTree, rangeSum, rangeMin, rangeMax } from "../src/index.js";

test("rangeSum: basic query after construction", () => {
  const t = new SegmentTree(5, rangeSum, [1, 2, 3, 4, 5]);
  assert.equal(t.query(0, 4), 15);
  assert.equal(t.query(1, 3), 9);
  assert.equal(t.query(2, 2), 3);
});

test("rangeSum: defaults to zeros when no initial array given", () => {
  const t = new SegmentTree(4, rangeSum);
  assert.equal(t.query(0, 3), 0);
});

test("rangeSum: range assignment then query", () => {
  const t = new SegmentTree(6, rangeSum, [1, 2, 3, 4, 5, 6]);
  t.update(1, 4, 10);
  // [1, 10, 10, 10, 10, 6]
  assert.equal(t.query(0, 5), 47);
  assert.equal(t.query(1, 4), 40);
  assert.equal(t.query(0, 0), 1);
  assert.equal(t.query(5, 5), 6);
});

test("rangeSum: overlapping updates, later wins", () => {
  const t = new SegmentTree(5, rangeSum, [0, 0, 0, 0, 0]);
  t.update(0, 4, 5);   // [5,5,5,5,5]
  t.update(1, 3, 2);   // [5,2,2,2,5]
  t.update(2, 2, 9);   // [5,2,9,2,5]
  assert.equal(t.query(0, 4), 23);
  assert.equal(t.query(0, 1), 7);
  assert.equal(t.query(3, 4), 7);
});

test("rangeSum: single-element tree", () => {
  const t = new SegmentTree(1, rangeSum, [42]);
  assert.equal(t.query(0, 0), 42);
  t.update(0, 0, 7);
  assert.equal(t.query(0, 0), 7);
});

test("rangeMin: query and assignment", () => {
  const t = new SegmentTree(5, rangeMin, [5, 3, 8, 1, 6]);
  assert.equal(t.query(0, 4), 1);
  assert.equal(t.query(0, 1), 3);
  t.update(0, 2, 0);  // [0,0,0,1,6]
  assert.equal(t.query(0, 4), 0);
  assert.equal(t.query(3, 4), 1);
});

test("rangeMax: query and assignment", () => {
  const t = new SegmentTree(5, rangeMax, [5, 3, 8, 1, 6]);
  assert.equal(t.query(0, 4), 8);
  t.update(3, 4, 10); // [5,3,8,10,10]
  assert.equal(t.query(0, 4), 10);
  assert.equal(t.query(0, 2), 8);
});

test("assignment of zero is distinguishable from no-op", () => {
  // This is the key edge case for using a hasLazy flag instead of a sentinel:
  // assigning 0 must actually take effect even though 0 is the identity for sum.
  const t = new SegmentTree(3, rangeSum, [5, 5, 5]);
  t.update(0, 2, 0);
  assert.equal(t.query(0, 2), 0);
  assert.equal(t.query(0, 0), 0);
});

test("negative values work", () => {
  const t = new SegmentTree(4, rangeSum, [-1, -2, -3, -4]);
  assert.equal(t.query(0, 3), -10);
  t.update(0, 1, 10); // [10,10,-3,-4]
  assert.equal(t.query(0, 3), 13);
});

test("full-range update then partial query", () => {
  const t = new SegmentTree(7, rangeSum, [1, 2, 3, 4, 5, 6, 7]);
  t.update(0, 6, 3);
  assert.equal(t.query(0, 6), 21);
  assert.equal(t.query(2, 4), 9);
});

test("update then update then query exercises push-down", () => {
  // Two layered updates on a range large enough to span multiple nodes,
  // then a query on a subrange. This forces _push to run on internal nodes
  // that carry a lazy tag from the first update.
  const t = new SegmentTree(8, rangeSum, [0,0,0,0,0,0,0,0]);
  t.update(0, 7, 4);   // all 4
  t.update(2, 5, 1);   // [4,4,1,1,1,1,4,4]
  assert.equal(t.query(0, 7), 20);
  assert.equal(t.query(2, 5), 4);
  assert.equal(t.query(0, 1), 8);
  assert.equal(t.query(6, 7), 8);
});

test("invalid ranges throw", () => {
  const t = new SegmentTree(5, rangeSum, [1,2,3,4,5]);
  assert.throws(() => t.query(-1, 2), RangeError);
  assert.throws(() => t.query(0, 5), RangeError);
  assert.throws(() => t.query(3, 1), RangeError);
  assert.throws(() => t.update(-1, 2, 0), RangeError);
  assert.throws(() => t.update(0, 5, 0), RangeError);
});

test("constructor validates arguments", () => {
  assert.throws(() => new SegmentTree(-1, rangeSum), RangeError);
  assert.throws(() => new SegmentTree(1.5, rangeSum), RangeError);
  assert.throws(() => new SegmentTree(3, null), TypeError);
  assert.throws(() => new SegmentTree(3, { identity: 0 }), TypeError);
  assert.throws(() => new SegmentTree(3, rangeSum, [1, 2]), RangeError);
});
