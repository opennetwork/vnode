import { isFragmentVNode, isMarshalledVNode, isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { isSourceReference } from "./source-reference";
import {
  asyncExtendedIterable,
  isIterableIterator,
  isPromise
} from "iterable";
import { LaneInput, merge, MergeOptions } from "@opennetwork/progressive-merge";
import type { CreateNodeFn } from "./create-node";

export interface EdgesContext extends MergeOptions {
  createNode: CreateNodeFn;
}

export type DirectedEdge = "children";

export async function* childrenUnion<N extends VNode>(context: MergeOptions, childrenGroups: LaneInput<N[]>): AsyncIterable<N[]> {
  yield *edgesUnion(context, childrenGroups);
}

export async function* edgesUnion<N extends VNode>(context: MergeOptions, edgesGroups: LaneInput<N[]>): AsyncIterable<N[]> {
  for await (const parts of merge(edgesGroups, context)) {
    yield parts.reduce(
      (updates: N[], part: N[]): N[] => part ? updates.concat(part.filter(Boolean)) : updates,
      []
    );
  }
}

export async function *children(context: EdgesContext, ...source: VNodeRepresentationSource[]): AsyncIterable<VNode[]> {
  yield *edges(context, ...source);
}

export async function *edges(context: EdgesContext, ...source: VNodeRepresentationSource[]): AsyncIterable<VNode[]> {
  async function *eachSource(source: VNodeRepresentationSource): AsyncIterable<VNode[]> {
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
      return yield [
        source
      ];
    }

    // These need further processing through createVNodeWithContext
    if (isSourceReference(source) || isMarshalledVNode(source) || isIterableIterator(source)) {
      return yield* eachSource(context.createNode(source));
    }

    return yield* edgesUnion(
      context,
      asyncExtendedIterable(source).map(eachSource)
    );
  }

  if (source.length === 1) {
    return yield* eachSource(source[0]);
  } else {
    return yield* edgesUnion(context, source.map(eachSource));
  }
}
