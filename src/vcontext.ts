import { Source } from "./source";
import { VNode, VNodeRepresentationSource } from "./vnode";
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
export interface VContext<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  TVNode extends VNode = VNode,
  TTree extends Tree = Tree
  > {

  events?: VContextEvents<O, S, C, TVNode, TTree>;

  weak?: WeakMap<object, unknown>;

  /**
   * This function is invoked by {@link hydrate}
   *
   * The functionality provided by this function is up to the implementation
   * @param node
   * @param tree
   */
  hydrate?: (node: VNode, tree?: Tree) => Promise<void>;

  /**
   * This function is invoked by a VContext consumer, it allows the VContext to perform any
   * clean up tasks that are required
   */
  close?: () => Promise<void>;

}
