import {
  Source
} from "./source";
import { VContext } from "./vcontext";
import {
  VNode,
  VNodeRepresentationSource
} from "./vnode";
import { createVNodeWithContext } from "./create-node";

export * from "./fragment";
export * from "./source";
export * from "./vcontext";
export * from "./vcontext-weak";
export * from "./vcontext-events";
export * from "./vnode";
export * from "./hydrate";
export * from "./children";
export * from "./create-node";
export * from "./tree";
export * from "./marshal";

/**
 * Generates instances of {@link VNode} based on the provided source
 *
 * See {@link createVNodeWithContext}
 *
 * @param context
 * @param source
 * @param options
 * @param children
 */
export function createVNode<O extends object>(context: VContext, source: Source<O>, options?: O, ...children: VNodeRepresentationSource[]): VNode {
  return createVNodeWithContext(context, source, options, ...children);
}

/**
 * Binds {@link createVNode} to the given context
 *
 * The returned function matches {@link createVNode} in both arguments and return type
 * If a context is given to the returned function, it will override the bound context
 *
 * @param context
 */
export function withContext(context: VContext) {
  return function createVNodeWithContext<O extends object>(source: Source<O>, options?: O, ...children: VNodeRepresentationSource[]): VNode {
    return createVNode(context, source, options, ...children);
  };
}
