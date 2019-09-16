import { Source } from "./source";
import { VNode, VNodeRepresentationSource } from "./vnode";
import { Tree } from "./tree";

export interface VContextHydrateEvent {
  node: VNode;
  tree?: Tree;
}

export interface VContextCreateVNodeEvent<O extends object> {
  source: Source<O>;
  options: O;
}

export interface VContextChildrenEvent {
  children: AsyncIterable<VNodeRepresentationSource>;
}

export interface VContextEvents {

  createVNode?: AsyncIterable<VContextCreateVNodeEvent<any>>;
  children?: AsyncIterable<VContextChildrenEvent>;
  hydrate?: AsyncIterable<VContextHydrateEvent>;

}
