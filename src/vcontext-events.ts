import { VContext } from "./vcontext";
import { Source } from "./source";
import { ContextSourceOptions } from "./source-options";
import { VNode, VNodeRepresentation } from "./vnode";
import { Tree } from "./tree";

export interface VContextHydrateEvent<C extends VContext> {
  node: VNode;
  tree?: Tree;
}

export interface VContextCreateVNodeEvent<C extends VContext> {
  source: Source<C, ContextSourceOptions<C>>;
  options: ContextSourceOptions<C>;
}

export interface VContextChildrenEvent<C extends VContext> {
  children: AsyncIterable<VNodeRepresentation>;
  options: ContextSourceOptions<C>;
}

export interface VContextEvents<C extends VContext> {

  createVNode?: AsyncIterable<VContextCreateVNodeEvent<C>>;
  children?: AsyncIterable<VContextChildrenEvent<C>>;
  hydrate?: AsyncIterable<VContextHydrateEvent<C>>;
  
}
