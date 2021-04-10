import { Source } from "./source";
import { VNode, VNodeRepresentationSource } from "./vnode";
import { Tree } from "./tree";
import { Collector } from "microtask-collector";

export interface VContextHydrateEvent {
  node: VNode;
  tree?: Tree;
}

export interface VContextCreateVNodeEvent<O extends object = object> {
  source: Source<O>;
  options: O;
}

export interface VContextChildrenEvent {
  children: VNodeRepresentationSource[];
}

export interface VContextEvents {
  createVNode?: AsyncIterable<VContextCreateVNodeEvent[]>;
  children?: AsyncIterable<VContextChildrenEvent[]>;
  hydrate?: AsyncIterable<VContextHydrateEvent[]>;
}

export interface VContextEventsTarget extends VContextEvents {
  createVNode?: Collector<VContextCreateVNodeEvent>;
  children?: Collector<VContextChildrenEvent>;
  hydrate?: Collector<VContextHydrateEvent>;
}

export interface VContextEventsPair {
  target: VContextEventsTarget;
  events: VContextEvents;
}

export function createVContextEvents(): VContextEventsPair {
  const target: VContextEventsTarget = {
    createVNode: new Collector<VContextCreateVNodeEvent>({
      eagerCollection: true
    }),
    children: new Collector<VContextChildrenEvent>({
      eagerCollection: true
    }),
    hydrate: new Collector<VContextHydrateEvent>({
      eagerCollection: true
    })
  };
  return {
    target,
    events: target
  };
}
