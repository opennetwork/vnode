import { Source } from "./source";
import { SourceReference } from "./source-reference";
import { FragmentVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { VContextEvents } from "./vcontext-events";
import { Tree } from "./tree";

/**
 * A {@link VContext} is a way for an implementor to provide "global" functionality
 *
 * A {@link VContext} can be bound to a {@link VNode} using {@link withContext}, {@link createVNode}, or {@link createVNodeWithContext}
 *
 * Any {@link VContext} can hydrate {@link VNode} instances, irregardless of what {@link VContext} it was bound to during creation
 * this allows contexts to segregate based on the values provided by {@link VNode} directly
 */
export interface VContext {

  events?: VContextEvents;

  weak?: WeakMap<object, unknown>;

  /**
   * This function is invoked during {@link createVNodeWithContext}, it allows a {@link VContext} to override this functionality
   *
   * If no value is returned then {@link createVNodeWithContext} will continue as normal
   * @param source
   * @param options
   */
  createVNode?: <O extends object>(source: Source<O>, options: O) => undefined | FragmentVNode;
  /**
   * This function is invoked during {@link children}, it allows a {@link VContext} to override this functionality
   *
   * If no value is returned then {@link children} will continue as normal
   * @param source
   * @param options
   */
  children?: (children: VNodeRepresentationSource[]) => undefined | AsyncIterable<AsyncIterable<VNode>>;
  /**
   * This function is invoked by {@link hydrate}
   *
   * The functionality provided by this function is up to the implementation
   * @param node
   * @param tree
   */
  hydrate?: (node: VNode, tree?: Tree) => Promise<void>;

  /**
   * This function is invoked by {@link createVNode} when a reference is to be created for a
   * {@link VNode}, it can be used to replace the reference that is being utilised
   *
   * Construction of a reference must be synchronous
   */
  reference?: (reference?: SourceReference) => SourceReference;

  /**
   * This function is invoked by a VContext consumer, it allows the VContext to perform any
   * clean up tasks that are required
   */
  close?: () => Promise<void>;

}
