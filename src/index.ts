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

export * from "./fragment";
export * from "./source";
export * from "./source-options";
export * from "./vcontext";
export * from "./vnode";

export function context<C extends VContext>(context: C) {
  return async function *createElement<O extends SourceOptions<C>>(source: Source<C, O>, options?: O, ...children: VNodeRepresentation[]): AsyncIterable<VNode | undefined> {
    const reference = options.reference || Symbol("Element");
    const hydratedOptions: O & ContextSourceOptions<C> = {
      ...options,
      reference: reference,
      context: await (options.context || context),
      children
    };
    yield* createElementWithContext(source, hydratedOptions);
  };
}
