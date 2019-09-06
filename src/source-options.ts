import { VContext } from "./vcontext";
import { VNode } from "./vnode";
import { SourceReference } from "./source";

export interface SourceOptions<C extends VContext> {
  context?: C | Promise<C>;
  children?: AsyncIterable<VNode>;
  reference?: SourceReference;
}

export interface ContextSourceOptions<C extends VContext> extends SourceOptions<C> {
  readonly context: C;
  readonly children: AsyncIterable<VNode>;
}
