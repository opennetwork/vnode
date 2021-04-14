import { VContext } from "./vcontext";
import { VContextEvents, VContextEventsTarget, createVContextEvents, VContextEventsPair } from "./vcontext-events";
import { Source } from "./source";
import { VNode, VNodeRepresentationSource } from "./vnode";
import { Tree } from "./tree";

export class WeakVContext<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  TVNode extends VNode = VNode,
  TTree extends Tree = Tree
  > implements VContext<O, S, C, TVNode, TTree> {

  public readonly weak: WeakMap<object, unknown>;
  public readonly events: VContextEvents<O, S, C, TVNode, TTree>;
  protected readonly eventsTarget: VContextEventsTarget<O, S, C, TVNode, TTree>;

  constructor(weak?: WeakMap<object, unknown>, { events, target }: VContextEventsPair<O, S, C, TVNode, TTree> = createVContextEvents()) {
    this.weak = weak || new WeakMap<object, unknown>();
    this.events = events;
    this.eventsTarget = target;
  }

  hydrate(node: TVNode, tree?: TTree): Promise<void> {
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
