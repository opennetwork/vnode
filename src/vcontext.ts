import { Source, SourceReference } from "./source";
import { VNode, VNodeRepresentation } from "./vnode";
import { ContextSourceOptions } from "./source-options";
import { VContextEvents } from "./vcontext-events";

export interface Tree {
  reference: SourceReference;
  children: ReadonlyArray<SourceReference>;
  parent?: Tree;
}

export interface VContext {

  events?: VContextEvents<this>;

  weak?: WeakMap<object, unknown>;
  createVNode?: <O extends ContextSourceOptions<this>>(source: Source<this, O>, options: O) => undefined | AsyncIterable<VNode>;
  children?: <O extends ContextSourceOptions<this>>(children: AsyncIterable<VNodeRepresentation>, options: O) => undefined | AsyncIterable<VNode>;
  hydrate?: (node: VNode, tree?: Tree) => Promise<void>;

}
