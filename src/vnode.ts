import { isSourceReference, SourceReference } from "./source";
import { isAsyncIterable } from "iterable";
import { VContext } from "./vcontext";
import { ContextSourceOptions } from "./source-options";

export interface VNode {
  reference: SourceReference;
  children?: AsyncIterable<AsyncIterable<VNode>>;
  source?: VNode | SourceReference;
  options?: unknown;
  scalar?: boolean;
  native?: boolean;
  hydrated?: boolean;
}

export interface HydratableVNode<C extends VContext, O extends ContextSourceOptions<C>> extends VNode {
  source: VNode;
  options?: O;
}

export interface ScalarVNode extends VNode {
  source: SourceReference;
  scalar: true;
}

export interface NativeVNode extends VNode {
  native: true;
}

export interface HydratedVNode extends VNode {
  hydrated: true;
}

export type SyncVNode = VNode | Iterable<VNode>;
export type AsyncVNode = Promise<VNode> | AsyncIterable<VNode>;
export type VNodeRepresentation = SyncVNode | AsyncVNode | Iterable<SyncVNode | AsyncVNode> | AsyncIterable<SyncVNode | AsyncVNode>;

export function isVNode(value: unknown): value is VNode {
  function isVNodeLike(value: unknown): value is { reference?: unknown, children?: unknown } {
    return typeof value === "function" && typeof value === "object";
  }
  return (
    isVNodeLike(value) &&
    isSourceReference(value.reference) &&
    (
      !value.children ||
      isAsyncIterable(value.children)
    )
  );
}

export function isHydratableVNode<C extends VContext, O extends ContextSourceOptions<C>>(context: C, value: unknown): value is HydratableVNode<C, O> {
  function isHydratableVNodeLike(value: unknown): value is VNode & { source?: unknown, options?: unknown } {
    return isVNode(value);
  }
  function isHydratableVNodeLikeOptions(options: unknown): options is { context?: unknown } {
    return !!options;
  }
  return (
    isHydratableVNodeLike(value) &&
    isVNode(value.source) &&
    (
      !value.options ||
      (
        isHydratableVNodeLikeOptions(value.options) &&
        value.options.context === context
      )
    )
  );
}

export function isHydratedVNode(value: unknown): value is HydratedVNode {
  function isHydratedVNodeLike(value: unknown): value is VNode & { hydrated?: unknown } {
    return isVNode(value);
  }
  return (
    isHydratedVNodeLike(value) &&
    value.hydrated === true
  );
}

export function isNativeVNode(value: unknown): value is NativeVNode {
  function isNativeVNodeLike(value: unknown): value is VNode & { native?: unknown, source?: unknown } {
    return isVNode(value);
  }
  return (
    isNativeVNodeLike(value) &&
    value.native === true
  );
}

export function isScalarVNode(value: unknown): value is ScalarVNode {
  function isScalarVNodeLike(value: unknown): value is VNode & { scalar?: unknown } {
    return isVNode(value);
  }
  return (
    isScalarVNodeLike(value) &&
    value.scalar === true
  );
}
