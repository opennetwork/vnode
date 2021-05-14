import {
  FragmentVNode,
  isFragmentVNode,
  isMarshalledVNode,
  isVNode,
  MarshalledVNode,
  ScalarVNode,
  VNode,
  VNodeRepresentationSource
} from "./vnode";
import { isSourceReference, SourceReference } from "./source-reference";
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

export type ChildrenSourceResolution<C> =
  C extends undefined ? unknown :
  C extends Promise<infer R> ? ChildrenSourceResolution<R> :
  C extends FragmentVNode ? C extends { children: AsyncIterable<(infer R)[]> } ? ChildrenSourceResolution<R> : unknown :
  C extends VNode ? C :
  C extends SourceReference ? ScalarVNode & { source: C } :
  C extends MarshalledVNode ? VNode & Exclude<C, "children">:
  C extends AsyncGenerator<infer R> ? ChildrenSourceResolution<R> :
  C extends Generator<infer R> ? ChildrenSourceResolution<R> :
  C extends AsyncIterable<infer R> ? ChildrenSourceResolution<R> :
  C extends Iterable<infer R> ? ChildrenSourceResolution<R> :
  VNode;

export type ChildrenResolution<C extends VNodeRepresentationSource[]> = ChildrenSourceResolution<C[0]>;

export async function *children<C extends VNodeRepresentationSource[]>(context: ChildrenContext, ...source: C): AsyncIterable<ChildrenResolution<C>[]> {
  async function *eachSource(source: VNodeRepresentationSource): AsyncIterable<ChildrenResolution<C>[]> {
    if (typeof source === "undefined") {
      return;
    }

    if (isPromise(source)) {
      return yield* eachSource(await source);
    }

    if (isFragmentChildrenResolution(source)) {
      return yield* source.children ?? [];
    }

    if (isVNodeChildrenResolution(source)) {
      return yield [
        source
      ];
    }

    if (isVNode(source)) {
      throw new Error("Unexpected, isVNodeChildrenResolution returns true for all isVNode");
    }

    // These need further processing through createVNodeWithContext
    if (isSourceReference(source) || isMarshalledVNode(source) || isIterableIterator(source)) {
      return yield* eachSource(context.createNode(source));
    }

    return yield* childrenUnion(
      context,
      asyncExtendedIterable(source).map(eachSource)
    );

    function isFragmentChildrenResolution(source: VNodeRepresentationSource): source is VNode & { children: AsyncIterable<ChildrenResolution<C>[]> } {
      return isFragmentVNode(source);
    }

    function isVNodeChildrenResolution(source: VNodeRepresentationSource): source is VNode & ChildrenResolution<C> {
      return isVNode(source);
    }
  }

  if (source.length === 1) {
    return yield* eachSource(source[0]);
  } else {
    return yield* childrenUnion(context, source.map(eachSource));
  }
}
