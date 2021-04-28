import { isFragmentVNode, isMarshalledVNode, isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference } from "./source-reference";
import {
  asyncExtendedIterable,
  isIterableIterator,
  isPromise
} from "iterable";
import { Source } from "./source";
import { LaneInput, merge, setReuse } from "@opennetwork/progressive-merge";

export interface ChildrenContext {
  createNode: (source: Source<never>) => VNode;
  reuse?: boolean;
}

async function* childrenUnion(context: ChildrenContext, childrenGroups: LaneInput<ReadonlyArray<VNode>>): AsyncIterable<ReadonlyArray<VNode>> {
  let source = childrenGroups;
  if (context.reuse) {
    source = asyncExtendedIterable(childrenGroups).map(input => {
      setReuse(input);
      return input;
    });
  }
  for await (const parts of merge(source)) {
    yield parts.reduce(
      (updates: VNode[], part: (VNode | undefined)[]): VNode[] => updates.concat((part || []).filter(value => value)),
      []
    );
  }
}

export async function *children(context: ChildrenContext, ...source: VNodeRepresentationSource[]): AsyncIterable<ReadonlyArray<VNode>> {
  async function *eachSource(source: VNodeRepresentationSource): AsyncIterable<ReadonlyArray<VNode>> {
    if (typeof source === "undefined") {
      return;
    }

    if (isPromise(source)) {
      return yield* eachSource(await source);
    }

    if (isFragmentVNode(source)) {
      return yield* source.children ?? [];
    }

    if (isVNode(source)) {
      return yield Object.freeze([
        source
      ]);
    }

    // These need further processing through createVNodeWithContext
    if (isSourceReference(source) || isMarshalledVNode(source) || isIterableIterator(source)) {
      return yield* eachSource(context.createNode(source));
    }

    return yield* childrenUnion(
      context,
      asyncExtendedIterable(source).map(eachSource)
    );
  }

  if (source.length === 1) {
    return yield* eachSource(source[0]);
  } else {
    return yield* childrenUnion(context, source.map(eachSource));
  }
}
