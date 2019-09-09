import { VContext } from "./vcontext";
import { VNodeRepresentationSource } from "./vnode";
import { SourceReference } from "./source";

/**
 * Basic options that can be passed to {@link createVNode}
 *
 * These values are all optional, but if passed must be one of the following typs
 */
export interface SourceOptions<C extends VContext> {
  context?: C;
  children?: AsyncIterable<VNodeRepresentationSource<C, unknown> | undefined>;
  reference?: SourceReference;
}

/**
 * These are options that have been passed through {@link createVNode}
 *
 * These values will be available to any
 */
export interface ContextSourceOptions<C extends VContext> extends SourceOptions<C> {
  readonly context: C;
  readonly children: AsyncIterable<VNodeRepresentationSource<C, unknown> | undefined>;
  readonly reference: SourceReference;
}
