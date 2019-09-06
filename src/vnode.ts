import { isSourceReference, SourceReference } from "./source";
import { isAsyncIterable } from "iterable";

export interface VNode {
  reference: SourceReference;
  children: AsyncIterable<SourceReference>;
}

export type SyncVNode = VNode | Iterable<VNode>;
export type AsyncVNode = Promise<VNode> | AsyncIterable<VNode>;
export type VNodeRepresentation = SyncVNode | AsyncVNode | Iterable<SyncVNode | AsyncVNode> | AsyncIterable<SyncVNode | AsyncVNode>;

export function isVNode(value: unknown): value is VNode {
  function isVNodeLike(value: unknown): value is { reference?: unknown, children?: unknown } {
    return typeof value === "object";
  }
  return (
    isVNodeLike(value) &&
    isSourceReference(value.reference) &&
    isAsyncIterable(value.children)
  );
}
