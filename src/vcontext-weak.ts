import { VContext } from "./vcontext";
import { VContextEvents, VContextEventsTarget, createVContextEvents } from "./vcontext-events";
import { Source } from "./source";
import { VNode, VNodeRepresentationSource } from "./vnode";
import { Tree } from "./tree";

export class WeakVContext implements VContext {

  public readonly weak: WeakMap<object, unknown>;
  public readonly events: VContextEvents;
  protected readonly eventsTarget: VContextEventsTarget;

  constructor(weak?: WeakMap<object, unknown>) {
    this.weak = weak || new WeakMap<object, unknown>();
    const { events, target } = createVContextEvents();
    this.events = events;
    this.eventsTarget = target;
  }

  createVNode<O extends object>(source: Source<O>, options: O): undefined {
    this.eventsTarget.createVNode.add({
      source,
      options
    });
    return undefined;
  }

  children(children: VNodeRepresentationSource[]): undefined {
    this.eventsTarget.children.add({
      children
    });
    return undefined;
  }

  hydrate(node: VNode, tree?: Tree): Promise<void> {
    this.eventsTarget.hydrate.add({
      node,
      tree
    });
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.eventsTarget.children.close();
    this.eventsTarget.hydrate.close();
    this.eventsTarget.createVNode.close();
    return Promise.resolve();
  }


}
