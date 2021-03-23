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
  createVNode?: AsyncIterable<ReadonlyArray<VContextCreateVNodeEvent>>;
  children?: AsyncIterable<ReadonlyArray<VContextChildrenEvent>>;
  hydrate?: AsyncIterable<ReadonlyArray<VContextHydrateEvent>>;
}

export interface VContextEventsTarget extends VContextEvents {
  createVNode?: Collector<VContextCreateVNodeEvent, ReadonlyArray<VContextCreateVNodeEvent>>;
  children?: Collector<VContextChildrenEvent, ReadonlyArray<VContextChildrenEvent>>;
  hydrate?: Collector<VContextHydrateEvent, ReadonlyArray<VContextHydrateEvent>>;
}

export interface VContextEventsPair {
  target: VContextEventsTarget;
  events: VContextEvents;
}


export function createVContextEvents(): VContextEventsPair {
  const target: VContextEventsTarget = {
    createVNode: new Collector<VContextCreateVNodeEvent, ReadonlyArray<VContextCreateVNodeEvent>>({
      map: Object.freeze
    }),
    children: new Collector<VContextChildrenEvent, ReadonlyArray<VContextChildrenEvent>>({
      map: Object.freeze
    }),
    hydrate: new Collector<VContextHydrateEvent, ReadonlyArray<VContextHydrateEvent>>({
      map: Object.freeze
    })
  };
  return {
    target,
    events: target
  };
}
