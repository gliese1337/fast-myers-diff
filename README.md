Fast-Myers-Diff
================

This is a fast, compact, memory efficient implementation of the O(ND) Myers diff algorithm.
Minified and including type definitions, the published library is less than 4KB.

This implementation improves on a naive implementation of Myers recursive algorithm in several ways:
* By using circular buffers for k-line computations, we achieve bounds of O(min(N,M) + D) space and O(min(N,M) * D) time,
  where N and M are the lengths of the input sequences and D is the number of differences.
* The original recursive algorithm is replaced by an iterative version with a minimal stack storing the altered parameters for right-recursion.
  All other recursive calls are tail calls replaced with simple jumps (via `break` or `continue`). Huge inputs may blow the heap, but you'll never overflow the stack!
* Allocation is minimized by pre-allocating buffer space to be re-used by each simulated recursive call, re-using stack slots, and tracking indices into the original inputs. The core diff algorithm performs no slice operations or other copying of data. This also minimizes garbage production and GC pause time.
* Buffers are allocated contiguously (using typed arrays) to improve cache locality.
* Buffers use the smallest numeric type possible for the input length; note that this results in discontinuous bumps in memory usage at input sizes of 256 and 65536.

Because the core algorithm does not slice or copy data, it depends only on being able to compare elements of the inputs at arbitrary indices.
Thus, it automatically operates equally well on any indexable type--strings, basic arrays, or any flavor of typed array.
Additionally, the library permits optimizing total application memory usage by producing output in the form of generators, rather than forcing you to accumulate the full output up-front.

### Comparison With Other Lbraries
- [myers-diff](https://www.npmjs.com/package/myers-diff/v/2.0.1) is focused on strings and does the tokenization internally, supporting `'words'`, `'chars'` or `'line'` compare modes as well as custom regular expressions.
- [fast-diff](https://www.npmjs.com/package/fast-diff/v/1.2.1) is specialized on character mode, using substrings instead of comparing characters one by one.
- [fast-array-diff](https://www.npmjs.com/package/fast-array-diff) is specialized for arrays.
 - **fast-myers-diff**: is type agnostic and uses an iterative implementation.

All `myers-diff`, `fast-diff`, and `fast-myers-diff` all have the ability to compute character differences between strings.

### Interface

The library exports the following interface:

```ts
type GenericIndexable = {
    [key: number]: unknown;
    readonly length: number;
};
type Indexable = string | unknown[] | TypedArray | GenericIndexable;
interface Sliceable extends GenericIndexable {
    slice(start: number, end?: number): this;
}

declare function diff_core(i: number, N: number, j: number, M: number, eq: (i: number, j: number) => boolean): Generator<[number, number, number, number]>;
declare function diff<T extends Indexable>(xs: T, ys: T, eq?: (i: number, j: number) => boolean): Generator<[number, number, number, number]>;
declare function lcs<T extends Indexable>(xs: T, ys: T, eq?: (i: number, j: number) => boolean): Generator<[number, number, number]>;

declare function calcPatch<T extends Sliceable>(xs: T, ys: T, eq?: (i: number, j: number) => boolean): Generator<[number, number, T]>;
declare function applyPatch<T extends Sliceable>(xs: T, patch: Iterable<[number, number, T]>): Generator<T>;

declare function calcSlices<T, S extends Sliceable<T>>(xs: S, ys: S, eq?: Comparator): Generator<[-1 | 0 | 1, S]>;
```

`diff_core(i, N, j, M, eq)` is the core of the library; given starting indices `i` and `j`, and slice-lengths `N` and `M` (i.e., the remaining length of the relevane sequence after the starting index), it produces a sequence of quadruples `[sx, ex, sy, ey]`, where [sx, ex) indicates a range to delete from `xs` and [sy, ey) indicates a range from `ys` to replace the deleted material with. Simple deletions are indicated when `sy === ey` and simple insertions when `sx === ex`. Note that direct access to the sequences themselves is not required; instead, `diff_core`, take a callback function `eq` which is used to determine whether the relevant sequences are equal at given indices. Note that lacking access to the actual sequences being diffed *ensures* that the library cannot sacrifice efficiency by making temporary copies.

By writing your own `eq` implementation, it is possible to compute diffs of sequences of types which are not normally comparable (e.g., arrays of objects where you wish to use value equality rather than reference equality), and even to get diffs of data structures which are not natively indexable. Despite the overhead of making a function call for comparisons, this diff implementation is still significantly faster than `fast-diff` when the size of the diff is significant, as the speed of`fast-diff`'s native string comparisons becomes less important.

`diff(xs, ys[, eq])` is a wrapper around `diff_core` which checks for common affixes (reducing the memory consumption and time spent in the core diff algorithm) and calculates `i`, `j`, `N`, `M` and `eq` (if it is not supplied) automatically.

`lcs(xs, ys[, eq])` calls `diff` internally, but pre-processes the output to produce triples of the form `[sx, sy, l]`, where `sx` and `sy` are the starting idices in `xs` and `ys` respectively of an aligned common substring, and `l` is the length of said substring. Indexing into the original input sequences can be used to retrieve the actual Longest Common Subsequence from this information, but the `lcs` function itself does not attempt to take slices of the inputs.

`calcPatch(xs, ys[, eq])` is a thin wrapper over `diff` which replaces the [sy, ey) indices with the relevant slice of `ys`. This can be used to reconstitute `ys` given `xs`. Once again, pure insertions are indicated when `sx === ex`, but pure deletions are indicated by an empty slice--i.e., an empty string, a zero-length array, etc. The insert slices are of the same type as the original `ys`. If `ys` is a string or an array, they are produced with the `slice` methods of strings or arrays, which will result in a shallow copy. If `ys` is a typed array, slices will be produced with `TypedArray.prototype.subarray`, which re-uses the existing underlying memory.

`applyPatch(xs, patch)` takes the output of `calcPatch(xs, ys)` and uses it to reconstitute the original elements of `ys`. The output is not, however, a single reconstituted `Indexable`, but a sequence of chunks taken alternately from `xs` and from the `patch` data. This is done for two reasons:
1. It avoids special-case code for joining each possible `Indexable` type;
2. As with all of the other library functions, it permits stream processing without deciding *for* you to allocate enough memory to hold the entire result at once.

`calcSlices(xs, ys)` is a thin wrapper over `diff` which uses the calculated indices to return the complete list of segments of `xs` and `ys` coded by whether they are unique to `xs` (deletions from `xs` to `ys`), components of the longest common subsequence, or unique to `ys` (insertions from `xs` to `ys`). Replacements at the same location result in yeilding the slice of `xs` first, followed by the slice of `ys`. The output elements are pairs of `[type, slice]`, where a type of -1 indicates the slice comes from `xs`, a type of 0 indicates that the slice is common, and a type of 1 indicates that the slice comes from `ys`. This is useful for displaying diffs in a UI, where you want all components shown with deletions and insertions highlighted.

`diff` and `lcs` will work with custom container types, as long as your container objects have a numeric `length` property. `calcPatch`, `applyPatch`, and `calcSlices` will work with custom types provided that they also implement a suitable `slice(start[, end])` method.

### Empirical results

The table below gives the number of operations per second reported by 
[benchmark](https://www.npmjs.com/package/benchmark/v/2.1.4) on a 
Windows 10 with Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz.

| input             | fast-myers-diff | fast-diff-1.2.0 | myers-diff-2.0.1 | fast-array-diff-1.0.1 | fast-myers-diff-2.0.0 |
| ----------------- | --------------- | --------------- | ---------------- | --------------------- | --------------------- |
| 10, +100, -100    | 1,139 ops/sec   | 2,724 ops/sec   | 768 ops/sec      | 17.38 ops/sec         | 1,115 ops/sec         |
| 10, +4, -200      | 4,217 ops/sec   | 9,094 ops/sec   | 875 ops/sec      | 10.26 ops/sec         | 4,119 ops/sec         |
| 100, +10, -10     | 40,825 ops/sec  | 14,531 ops/sec  | 1,049 ops/sec    | 92.39 ops/sec         | 42,327 ops/sec        |
| 100, +20, -0      | 43,265 ops/sec  | 18,649 ops/sec  | 976 ops/sec      | 127 ops/sec           | 44,582 ops/sec        |
| 100, +0, -20      | 45,387 ops/sec  | 15,867 ops/sec  | 988 ops/sec      | 92.10 ops/sec         | 48,545 ops/sec        |
| 10, +1000, -1000  | 12.06 ops/sec   | 32.86 ops/sec   | 7.23 ops/sec     | 0.18 ops/sec          | Not supported         |
| 10000, +100, -100 | 587 ops/sec     | 99.70 ops/sec   | 0.23 ops/sec     | 0.14 ops/sec          | Not supported         |
| 10000, +200, -0   | 685 ops/sec     | 95.26 ops/sec   | 0.23 ops/sec     | 0.13 ops/sec          | Not supported         |
| 10000, +0, -200   | 705 ops/sec     | 106 ops/sec     | 0.24 ops/sec     | 0.13 ops/sec          | Not supported         |
| 10000, +10, -10   | 2,905 ops/sec   | 64.11 ops/sec   | 0.28 ops/sec     | 1.13 ops/sec          | Not supported         |
| 10000, +20, -0    | 3,378 ops/sec   | 68.45 ops/sec   | 0.26 ops/sec     | 1.19 ops/sec          | Not supported         |
| 10000, +0, -20    | 3,730 ops/sec   | 59.50 ops/sec   | 0.27 ops/sec     | 1.19 ops/sec          | Not supported         |

`fast-myers-diff@2.0.0` and earlier used `Uint8Array` to save indices, so it can only correctly handle inputs with added length less than 256.

`fast-diff` is faster than `fast-myers-diff` for inputs in which the longest common string is a small portion of the sequences. For differences of 20% `fast-myers-diff` is about 6x faster, for differences of 2% about 50x faster.
Results for `fast-array-diff` may be depressed due to the need to convert test strings to arrays.

Another benchmarking run shows very similar results, with the latest version of fast-meyers-diff being the fastest by a large margin across most inputs, and fast-diff-1.2.0 pulling slightly ahead for inputs with very long edit scripts.

| input             | fast-myers-diff | fast-diff-1.2.0 | myers-diff-2.0.1 | fast-array-diff-1.0.1 | fast-myers-diff-2.0.0 |
| ----------------- | --------------- | --------------- | ---------------- | --------------------- | --------------------- |
| 10, +100, -100    | 1,155 ops/sec   | 1,415 ops/sec   | 398 ops/sec      | 14.35 ops/sec         | 610 ops/sec           |
| 10, +4, -200      | 4,217 ops/sec   | 4,776 ops/sec   | 413 ops/sec      | 9.76 ops/sec          | 2,106 ops/sec         |
| 100, +10, -10     | 39,941 ops/sec  | 4,980 ops/sec   | 520 ops/sec      | 80.47 ops/sec         | 23,352 ops/sec        |
| 100, +20, -0      | 42,264 ops/sec  | 9,178 ops/sec   | 430 ops/sec      | 95.52 ops/sec         | 24,884 ops/sec        |
| 100, +0, -20      | 45,564 ops/sec  | 4,304 ops/sec   | 480 ops/sec      | 53.13 ops/sec         | 25,206 ops/sec        |
| 10, +1000, -1000  | 9.14 ops/sec    | 12.51 ops/sec   | 4.40 ops/sec     | 0.14 ops/sec          | Not Supported         |
| 10000, +100, -100 | 357 ops/sec     | 29.94 ops/sec   | 0.13 ops/sec     | 0.12 ops/sec          | Not Supported         |
| 10000, +200, -0   | 350 ops/sec     | 48.94 ops/sec   | 0.13 ops/sec     | 0.11 ops/sec          | Not Supported         |
| 10000, +0, -200   | 575 ops/sec     | 51.99 ops/sec   | 0.13 ops/sec     | 0.13 ops/sec          | Not Supported         |
| 10000, +10, -10   | 2,108 ops/sec   | 33.35 ops/sec   | 0.14 ops/sec     | 1.17 ops/sec          | Not Supported         |
| 10000, +20, -0    | 2,065 ops/sec   | 34.75 ops/sec   | 0.14 ops/sec     | 1.32 ops/sec          | Not Supported         |
| 10000, +0, -20    | 2,410 ops/sec   | 26.34 ops/sec   | 0.15 ops/sec     | 1.24 ops/sec          | Not Supported         |
