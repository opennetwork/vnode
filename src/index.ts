import {
  Source
} from "./source";
import { ContextSourceOptions, SourceOptions } from "./source-options";
import { VContext } from "./vcontext";
import {
  VNode,
  VNodeRepresentation
} from "./vnode";
import { createVNodeWithContext } from "./create-node";
import { asyncExtendedIterable, isAsyncIterable, isIterable } from "iterable";

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

export async function *createVNode<C extends VContext, O extends SourceOptions<C>>(source: Source<C, O>, options?: O, ...children: VNodeRepresentation[]): AsyncIterable<VNode> {
  const context = await options.context;
  if (!context) {
    throw new Error("Context is required, please provide it at the top level using withContext");
  }
  const hydratedOptions: ContextSourceOptions<C> = {
    ...options,
    context,
    reference: (options || {}).reference || Symbol("Element"),
    children: asyncExtendedIterable((options || {}).children || children)
      .flatMap(child => (isIterable(child) || isAsyncIterable(child)) ? child : [child])
      .toIterable()
  };
  yield* createVNodeWithContext(source, hydratedOptions);
}

export function withContext<C extends VContext>(context: C) {
  return async function *createNodeWithContext<O extends SourceOptions<C>>(source: Source<C, O>, options?: O, ...children: VNodeRepresentation[]): AsyncIterable<VNode> {
    yield* createVNode(source, {
      ...options,
      context: (options || {}).context || context
    }, ...children);
  };
}
