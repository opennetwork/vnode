import {
  Source
} from "./source";
import { ContextSourceOptions, SourceOptions } from "./source-options";
import { VContext } from "./vcontext";
import {
  VNode,
  VNodeRepresentationSource
} from "./vnode";
import { createVNodeWithContext } from "./create-node";
import { asyncExtendedIterable, isAsyncIterable, isIterable, isIterableIterator } from "iterable";

export * from "./fragment";
export * from "./source";
export * from "./source-options";
export * from "./vcontext";
export * from "./vcontext-weak";
export * from "./vcontext-events";
export * from "./vnode";
export * from "./hydrate";
export * from "./children";
export * from "./create-node";
export * from "./tree";

/**
 * Generates instances of {@link VNode} based on the provided source
 *
 * See {@link createVNodeWithContext}
 *
 * @param source
 * @param options
 * @param children
 */
export async function *createVNode<C extends VContext, O extends SourceOptions<C>>(source: Source<C, O>, options?: O, ...children: VNodeRepresentationSource<C, unknown>[]): AsyncIterable<VNode> {
  if (!options.context) {
    throw new Error("Context is required, please provide it at the top level using withContext");
  }
  const hydratedOptions: ContextSourceOptions<C> = {
    ...options,
    context: options.context,
    reference: options ? options.reference || Symbol("Element") : Symbol("Element"),
    children: asyncExtendedIterable(options ? options.children || children : children)
      .flatMap((child): Iterable<VNodeRepresentationSource<C, unknown>> | AsyncIterable<VNodeRepresentationSource<C, unknown>> => {
        /**
         * If iterable iterator, skip flat mapping and use the value
         */
        if (isIterableIterator(child)) {
          return [child];
        }
        if (isIterable(child) || isAsyncIterable(child)) {
          return child;
        }
        return [child];
      })
      .toIterable()
  };
  return yield* createVNodeWithContext(source, hydratedOptions);
}

/**
 * Binds {@link createVNode} to the given context
 *
 * The returned function matches {@link createVNode} in both arguments and return type
 * If a context is given to the returned function, it will override the bound context
 *
 * @param context
 */
export function withContext<C extends VContext>(context: C) {
  return async function *createVNodeWithContext<O extends SourceOptions<C>>(source: Source<C, O>, options?: O, ...children: VNodeRepresentationSource<C, unknown>[]): AsyncIterable<VNode> {
    return yield* createVNode(source, {
      ...options,
      context: options ? options.context || context : context
    }, ...children);
  };
}
