import { VContext } from "./vcontext";
import { isFragmentVNode, isMarshalledVNode, isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference } from "./source-reference";
import {
  asyncExtendedIterable,
  isIterableIterator,
  isPromise
} from "iterable";
import { Source } from "./source";
import { latest, merge } from "@opennetwork/progressive-merge";

interface ChildrenUpdateArray extends ReadonlyArray<VNode> {
  parts: ReadonlyArray<ReadonlyArray<VNode>>;
}

export function isChildrenUpdateArray(array: ReadonlyArray<VNode>): array is ChildrenUpdateArray {
  function isChildrenUpdateArrayLike(array: unknown): array is { parts: unknown } {
    return Array.isArray(array);
  }
  return isChildrenUpdateArrayLike(array) && isChildrenUpdateArrayLike(array.parts);
}

async function* childrenUnion(childrenGroups: AsyncIterable<AsyncIterable<ReadonlyArray<VNode>>>): AsyncIterable<ReadonlyArray<VNode>> {
  for await (const parts of latest(merge(childrenGroups))) {
    const updates: ReadonlyArray<VNode> & { parts?: unknown } = parts.reduce(
      (updates: VNode[], part: VNode[]) => updates.concat(part),
      []
    );
    updates.parts = Object.freeze(parts);
    yield updates;
  }
}

export async function *children(createVNode: (context: VContext, source: Source<never>) => VNode, context: VContext, ...source: VNodeRepresentationSource[]): AsyncIterable<ReadonlyArray<VNode>> {
  if (context.children) {
    const result = context.children(source);
    if (result) {
      for await (const update of result) {
        yield Object.freeze(Array.isArray(update) ? update : [...update]);
      }
      return;
    }
  }

  async function *eachSource(source: VNodeRepresentationSource): AsyncIterable<ReadonlyArray<VNode>> {
    if (isPromise(source)) {
      return yield* eachSource(await source);
    }

    if (isFragmentVNode(source)) {
      return yield* source.children;
    }

    if (isVNode(source)) {
      return yield Object.freeze([
        source
      ]);
    }

    // These need further processing through createVNodeWithContext
    if (isSourceReference(source) || isMarshalledVNode(source) || isIterableIterator(source)) {
      return yield* eachSource(createVNode(context, source));
    }

    return yield* childrenUnion(
      asyncExtendedIterable(source).map(source => children(createVNode, context, source))
    );
  }

  if (source.length === 1) {
    return yield* eachSource(source[0]);
  } else {
    return yield* childrenUnion(asyncExtendedIterable(source).map(source => eachSource(source)));
  }
}
