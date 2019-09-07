import {
  Source
} from "./source";
import { ContextSourceOptions, SourceOptions } from "./source-options";
import { VContext } from "./vcontext";
import {
  VNode,
  VNodeRepresentation
} from "./vnode";
import { createElementWithContext } from "./create-element";
import { asyncExtendedIterable } from "iterable";

export * from "./fragment";
export * from "./source";
export * from "./source-options";
export * from "./vcontext";
export * from "./vnode";

export async function *createElement<C extends VContext, O extends SourceOptions<C>>(source: Source<C, O>, options?: O, ...children: VNodeRepresentation[]): AsyncIterable<VNode> {
  const context = await options.context;
  if (!context) {
    throw new Error("Context is required, please provide it at the top level using withContext");
  }
  const hydratedOptions: ContextSourceOptions<C> = {
    ...options,
    context,
    reference: options.reference || Symbol("Element"),
    children: asyncExtendedIterable(children)
  };
  yield* createElementWithContext(source, hydratedOptions);
}

export function withContext<C extends VContext>(context: C) {
  return async function *createElementWithContext<O extends SourceOptions<C>>(source: Source<C, O>, options?: O, ...children: VNodeRepresentation[]): AsyncIterable<VNode> {
    yield* createElement(source, {
      ...options,
      context: options.context || context
    });
  };
}
