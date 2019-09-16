import { Source } from "./source";
import { VNode, VNodeRepresentationSource } from "./vnode";
import { Tree } from "./tree";
import { TransientAsyncIteratorSource, source, asyncIterable } from "iterable";

export interface VContextHydrateEvent {
  node: VNode;
  tree?: Tree;
}

export interface VContextCreateVNodeEvent<O extends object> {
  source: Source<O>;
  options: O;
}

export interface VContextChildrenEvent {
  children: VNodeRepresentationSource[];
}

export interface VContextEvents {
  createVNode?: AsyncIterable<VContextCreateVNodeEvent<any>>;
  children?: AsyncIterable<VContextChildrenEvent>;
  hydrate?: AsyncIterable<VContextHydrateEvent>;
}

export interface VContextEventsTarget {
  createVNode?: TransientAsyncIteratorSource<VContextCreateVNodeEvent<any>>;
  children?: TransientAsyncIteratorSource<VContextChildrenEvent>;
  hydrate?: TransientAsyncIteratorSource<VContextHydrateEvent>;
}

export function createVContextEvents(): { target: VContextEventsTarget, events: VContextEvents } {
  const target: VContextEventsTarget = {
    createVNode: source(),
    children: source(),
    hydrate: source()
  };
  return {
    target,
    events: {
      createVNode: asyncIterable(target.createVNode),
      children: asyncIterable(target.children),
      hydrate: asyncIterable(target.hydrate)
    }
  };
}
