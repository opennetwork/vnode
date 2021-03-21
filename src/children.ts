import { VContext } from "./vcontext";
import { isFragmentVNode, isMarshalledVNode, isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference } from "./source-reference";
import {
  asyncExtendedIterable,
  isIterableIterator,
  isPromise
} from "iterable";
import { Source } from "./source";
import { MergeLaneInput, merge } from "@opennetwork/progressive-merge";

async function* childrenUnion(childrenGroups: MergeLaneInput<ReadonlyArray<VNode>>): AsyncIterable<ReadonlyArray<VNode>> {
  for await (const parts of merge(childrenGroups)) {
    yield parts.reduce(
      (updates: VNode[], part: (VNode | undefined)[]): VNode[] => updates.concat(part.filter(value => value)),
      []
    );
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
      asyncExtendedIterable(source).map(eachSource)
    );
  }

  if (source.length === 1) {
    return yield* eachSource(source[0]);
  } else {
    return yield* childrenUnion(source.map(eachSource));
  }
}
