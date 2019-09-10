import { isSourceReference, SourceReference } from "./source";
import { isAsyncIterable, AsyncIterableLike } from "iterable";
import { VContext } from "./vcontext";
import { ContextSourceOptions, SourceOptions } from "./source-options";
import { Fragment } from "./fragment";

/**
 * Generic VNode, represents a virtual node within a state tree
 *
 * The VNode can be used to hydrate native state or external sources
 */
export interface VNode {
  /**
   * A unique reference to this {@link VNode}, this could be a globally unique symbol like {@link Fragment}
   */
  reference: SourceReference;
  /**
   * An `AsyncIterable` that will return a `AsyncIterable<VNode>` that represents a group of children
   *
   * Each iteration represents an update to the {@link VNode}'s children state
   */
  children?: AsyncIterable<AsyncIterable<VNode>>;
  /**
   * The resolved source for the {@link VNode}
   *
   * A {@link VContext} may choose to utilise an external value to represent the source
   */
  source?: unknown;
  /**
   * The options provided to the {@link VNode} from the {@link createVNodeWithContext} function
   */
  options?: unknown;
  /**
   * See {@link ScalarVNode}
   */
  scalar?: boolean;
  /**
   * See {@link NativeVNode}
   */
  native?: boolean;
  /**
   * See {@link HydratedVNode}
   */
  hydrated?: boolean;
}

/**
 * A {@link VNode} that has a scalar {@link SourceReference} {@link VNode.source}
 *
 * A {@link ScalarVNode} can still have both {@link VNode.options} and {@link VNode.children}, so they should not be
 * disregarded
 *
 * A {@link ScalarVNode} can be used to represent a {@link VNode} with no backing {@link VContext}, which can be
 * picked up in a later external process
 */
export interface ScalarVNode extends VNode {
  source: SourceReference;
  scalar: true;
}

/**
 * {@link VContext} should utilise {@link NativeVNode} to indicate that the {@link VNode} is backed by a native
 * representation
 */
export interface NativeVNode extends VNode {
  native: true;
}

/**
 * A template for {@link VContext} to represent a {@link VNode} that is already hydrated and requires no more hydration
 */
export interface HydratedVNode extends VNode {
  hydrated: true;
}

/**
 * A {@link FragmentVNode} indicates a {@link VNode} where the {@link FragmentVNode} should be ignored and its
 * {@link VNode.children} should take its place
 *
 * A {@link FragmentVNode} may have no children, in which case, it should be ignored completely
 */
export interface FragmentVNode extends VNode {
  reference: typeof Fragment;
}

/**
 * A {@link VNode} that requires asynchronous resolution
 */
export type AsyncVNodeRepresentation = Promise<VNode> | AsyncIterable<VNode>;
/**
 * A {@link VNode} that can be resolved synchronously
 */
export type SyncVNodeRepresentation = VNode | Iterable<VNode>;
/**
 * A {@link VNode} with requiring _either_ synchronous or asynchronous resolution
 */
export type VNodeRepresentation = AsyncVNodeRepresentation | SyncVNodeRepresentation;
/**
 * A function that resolves to a {@link VNodeRepresentation} which can be further processed to obtain a group of {@link VNode} values
 */
export type VNodeRepresentationFactory<C extends VContext, O extends SourceOptions<C>> = (options: O & ContextSourceOptions<C>) => VNodeRepresentation;
/**
 * A value that represents a {@link VNode}
 */
export type VNodeRepresentationLike<C extends VContext, O extends SourceOptions<C>> = VNodeRepresentation | VNodeRepresentationFactory<C, O>;
/**
 * A value that represents a {@link VNode}
 */
export type BasicVNodeRepresentation<C extends VContext, O extends SourceOptions<C>> = VNodeRepresentationLike<C, O> | AsyncIterableLike<VNodeRepresentationLike<C, O>>;
/**
 * A value that represents a {@link VNode}
 */
export type VNodeRepresentationSource<C extends VContext, O extends SourceOptions<C>> = BasicVNodeRepresentation<C, O> | AsyncIterableLike<BasicVNodeRepresentation<C, O>>;

/**
 * Indicates if a value is a {@link VNode}
 * @param value
 */
export function isVNode(value: unknown): value is VNode {
  function isVNodeLike(value: unknown): value is { reference?: unknown, children?: unknown } {
    return typeof value === "function" || typeof value === "object";
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

/**
 * Indicates if a value is a {@link HydratedVNode}
 * @param value
 */
export function isHydratedVNode(value: unknown): value is HydratedVNode {
  function isHydratedVNodeLike(value: unknown): value is VNode & { hydrated?: unknown } {
    return isVNode(value);
  }
  return (
    isHydratedVNodeLike(value) &&
    value.hydrated === true
  );
}

/**
 * Indicates if a value is a {@link NativeVNode}
 * @param value
 */
export function isNativeVNode(value: unknown): value is NativeVNode {
  function isNativeVNodeLike(value: unknown): value is VNode & { native?: unknown, source?: unknown } {
    return isVNode(value);
  }
  return (
    isNativeVNodeLike(value) &&
    value.native === true
  );
}

/**
 * Indicates if a value is a {@link ScalarVNode}
 * @param value
 */
export function isScalarVNode(value: unknown): value is ScalarVNode {
  function isScalarVNodeLike(value: unknown): value is VNode & { scalar?: unknown } {
    return isVNode(value);
  }
  return (
    isScalarVNodeLike(value) &&
    value.scalar === true
  );
}

/**
 * Indicates if a value is a {@link FragmentVNode}
 * @param value
 */
export function isFragmentVNode(value: unknown): value is FragmentVNode {
  return (
    isVNode(value) &&
    value.reference === Fragment
  );
}
