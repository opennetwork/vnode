import { Source, SourceReference } from "./source";
import { VNode, VNodeRepresentation } from "./vnode";
import { ContextSourceOptions } from "./source-options";

export interface Tree {
  reference: SourceReference;
  children: ReadonlyArray<SourceReference>;
  parent?: Tree;
}

export interface VContext {

  weak?: WeakMap<object, unknown>;
  createElement?: <O extends ContextSourceOptions<this>>(source: Source<this, O>, options: O) => undefined | AsyncIterable<VNode>;
  children?: <O extends ContextSourceOptions<this>>(children: AsyncIterable<VNodeRepresentation>, options: O) => undefined | AsyncIterable<VNode>;
  hydrate?: (node: VNode, tree?: Tree, hydrateChildren?: () => Promise<void>) => Promise<void>;

}

const globalWeak = new WeakMap<object, unknown>();

export class WeakVContext implements VContext {

  public readonly weak: WeakMap<object, unknown>;

  constructor(weak?: WeakMap<object, unknown>) {
    this.weak = weak || globalWeak;
  }

}
