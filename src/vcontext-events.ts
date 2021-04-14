import { Source } from "./source";
import { VNode, VNodeRepresentationSource } from "./vnode";
import { Tree } from "./tree";
import { Collector } from "microtask-collector";

export interface VContextHydrateEvent<TVNode extends VNode = VNode, TTree extends Tree = Tree> {
  node: TVNode;
  tree?: TTree;
}

export interface VContextCreateVNodeEvent<O extends object = object, S = Source<O>> {
  source: S;
  options: O;
}

export interface VContextChildrenEvent<C extends VNodeRepresentationSource = VNodeRepresentationSource> {
  children: C[];
}

export interface VContextEvents<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  TVNode extends VNode = VNode,
  TTree extends Tree = Tree
  > {
  createVNode?: AsyncIterable<VContextCreateVNodeEvent<O, S>[]>;
  children?: AsyncIterable<VContextChildrenEvent<C>[]>;
  hydrate?: AsyncIterable<VContextHydrateEvent<TVNode, TTree>[]>;
}

export interface VContextEventsTarget<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  TVNode extends VNode = VNode,
  TTree extends Tree = Tree
  > extends VContextEvents<O, S, C, TVNode, TTree> {
  createVNode?: Collector<VContextCreateVNodeEvent<O, S>>;
  children?: Collector<VContextChildrenEvent<C>>;
  hydrate?: Collector<VContextHydrateEvent<TVNode, TTree>>;
}

export interface VContextEventsPair<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  TVNode extends VNode = VNode,
  TTree extends Tree = Tree
  > {
  target: VContextEventsTarget<O, S, C, TVNode, TTree>;
  events: VContextEvents<O, S, C, TVNode, TTree>;
}

export function createVContextEvents<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  TVNode extends VNode = VNode,
  TTree extends Tree = Tree
  >(): VContextEventsPair<O, S, C, TVNode, TTree> {
  const target: VContextEventsTarget<O, S, C, TVNode, TTree> = {
    createVNode: new Collector<VContextCreateVNodeEvent<O, S>>({
      eagerCollection: true
    }),
    children: new Collector<VContextChildrenEvent<C>>({
      eagerCollection: true
    }),
    hydrate: new Collector<VContextHydrateEvent<TVNode, TTree>>({
      eagerCollection: true
    })
  };
  return {
    target,
    events: target
  };
}
