import { isFragmentVNode, isMarshalledVNode, isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference } from "./source-reference";
import {
  asyncExtendedIterable,
  isIterableIterator,
  isPromise
} from "iterable";
import { LaneInput, merge, MergeOptions } from "@opennetwork/progressive-merge";
import type { CreateNodeFn } from "./create-node";

export interface ChildrenContext extends MergeOptions {
  createNode: CreateNodeFn;
}

export async function* childrenUnion<N extends VNode>(context: MergeOptions, childrenGroups: LaneInput<N[]>): AsyncIterable<N[]> {
  for await (const parts of merge(childrenGroups, context)) {
    yield parts.reduce(
      (updates: N[], part: N[]): N[] => part ? updates.concat(part.filter(Boolean)) : updates,
      []
    );
  }
}

export async function *children(context: ChildrenContext, ...source: VNodeRepresentationSource[]): AsyncIterable<VNode[]> {
  async function *eachSource(source: VNodeRepresentationSource): AsyncIterable<VNode[]> {
    if (typeof source === "undefined") {
      return;
    }

    if (isPromise(source)) {
      return yield* eachSource(await source);
    }

    if (isFragmentVNode(source)) {
      if (!source.children) {
        return;
      }
      for await (const children of source.children) {
        yield * childrenUnion(
          context,
          children.map(eachSource)
        );
      }
      return;
    }

    if (isVNode(source)) {
      return yield [
        source
      ];
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
