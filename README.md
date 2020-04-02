Fast-Myers-Diff
================

This is a fast, compact, memory efficient implementation of the O(ND) Myers diff algorithm.
The core diff algorithm, including blank lines and comment, is only 123 lines. With LCS and patch features added, the total library is still less than 200 lines.
Minified and including type definitions, the published library is less than 3KB.

This implementation improves on a naive implementation of Myers recursive algorithm in several ways:
* By using circular buffers for k-line computations, we achieve bounds of O(min(N,M) + D) space and O(min(N,M) * D) time,
  where N and M are the lengths of the input sequences and D is the number of differences.
* The original recursive algorithm is replaced by an iterative version with a minimal stack handling altered parameters for right-recursion.
  All other recursive calls are tail calls replaced with simple jumps (via `break` or `continue`). Huge inputs may blow the heap, but you'll never overflow the stack!
* Allocation is minimized by pre-allocating buffer space to be re-used by each simulated recursive call, and tracking indices into the original inputs.
  The core diff algorithm performs no slice operations or other copying of data.

Because the core algorithm does not slice or copy data, it depends only on being able to compare elements of the inputs at arbitrary indices.
Thus, it automatically operates equally well on any indexable type--strings, basic arrays, or any flavor of typed array.
Additionally, the library permits optimizing total application memory usage by producing output in the form of generators, rather than forcing you to accumulate the full output up-front.

The library exports the following interface:

```ts
type GenericIndexable = {
    [key: number]: unknown;
    readonly length: number;
};
type Indexable = string | unknown[] | TypedArray | GenericIndexable;
type Sliceable = TypedArray | (GenericIndexable & {
    slice(start: number, end?: number): Indexable;
});

function diff<T extends Indexable>(xs: T, ys: T): Generator<[number, number, number, number]>;
function lcs<T extends Indexable>(xs: T, ys: T): Generator<[number, number, number]>;

function calcPatch<T extends Sliceable>(xs: T, ys: T): Generator<[number, number, T]>;
function applyPatch<T extends Sliceable>(xs: T, patch: Iterable<[number, number, T]>): Generator<T>;
```

`diff(xs, ys)` is the core of the library; given two indexable sequences, `xs` and `ys`, it produces a sequence of quadruples `[sx, ex, sy, ey]`, where [sx, ex) indicates a range to delete from `xs` and [sy, ey) indicates a range from `ys` to replace the deleted material with. Simple deletions are indicated when `sy === ey` and simple insertions when `sx === ex`.

`lcs(xs, ys)` uses the same underlying diff implementation, but instead produces output in the form of triples `[sx, sy, l]`, where `sx` and `sy` are the starting idices in `xs` and `ys` respectively of an aligned common substring, and `l` is the length of said substring. Indexing into the original input sequences can be used to retrieve the actual LCS from this information.

`calcPatch(xs, ys)` is a thin wrapper over `diff(xs, ys)` which replaces the [sy, ey) indices with the relevant slice of `ys`. This can be used to reconstitute `ys` given `xs`. Once again, pure insertions are indicated when `sx === ex`, but pure deletions are indicated by an empty slice--i.e., an empty string, a zero-length array, etc. The insert slices are of the same type as the original `ys`. If `ys` is a string or an array, they are produced with the `slice` methods of strings or arrays, which will result in a shallow copy. If `ys` is a typed array, slices will be produced with `TypedArray.prototype.subarray`, which re-uses the existing underlying memory.

`applyPatch(xs, patch)` takes the output of `calcPatch(xs, ys)` and uses it to reconstitute the original elements of `ys`. The output is not, however, a single reconstituted `Indexable`, but a sequence of chunks taken alternately from `xs` and from the `patch` data. This is done for two reasons:
1. It avoids special-case code for joining each possible `Indexable` type;
2. As with all of the other library functions, it permits stream processing without deciding *for* you to allocate enough memory to hold the entire result at once.

This `diff(xs, ys)` and `lcs(xs, ys)` will also work with custom container types, as long as your container objects have a numeric `length` property. `calcPatch(xs, ys)` and 'applyPatch(xs, ys)` will also with with custom types, provided that they also implement a suitable `slice(start[, end])` method.