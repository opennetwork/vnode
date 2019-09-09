import { VContext } from "./vcontext";
import { ContextSourceOptions } from "./source-options";
import {
  isSourceReference,
  SourceReference,
  Source
} from "./source";
import {
  isVNode,
  VNode
} from "./vnode";
import { asyncExtendedIterable, isAsyncIterable, isIterable, isPromise, isIterableIterator, getNext } from "iterable";
import { flatten } from "./flatten";
import { children } from "./children";
import { Fragment } from "./fragment";

export async function *createVNodeWithContext<C extends VContext, HO extends ContextSourceOptions<C>>(source: Source<C, unknown>, options: HO): AsyncIterable<VNode> {
  // Allow entire function to be replaced if needed
  if (typeof options.context.createElement === "function") {
    const result = options.context.createElement(source, options);
    if (result) {
      return yield* result;
    }
  }

  if (source instanceof Function) {
    const nextSource = source({
      ...options
    });
    return yield* createVNodeWithContext(nextSource, options);
  }

  if (isPromise(source)) {
    source = await source;
  }

  if (isVNode(source)) {
    return yield* flatten(source);
  }

  if (isSourceReference(source)) {
    return yield {
      reference: options.reference,
      scalar: true,
      source: source,
      options
    };
  }

  if (isIterableIterator(source)) {
    return yield* generator(Symbol("Iterable Iterator"), source);
  }

  if (isIterable(source) || isAsyncIterable(source)) {
    return yield {
      reference: Fragment,
      children: children(options, asyncExtendedIterable(source).map(value => createVNodeWithContext(value, options)))
    };
  }

  return yield {
    reference: options.reference,
    source,
    options,
    children: children(options)
  };

  async function *generator(newReference: SourceReference, reference: IterableIterator<SourceReference> | AsyncIterableIterator<SourceReference>): AsyncIterableIterator<VNode> {
    let next: IteratorResult<SourceReference>;
    do {
      next = await getNext(reference, newReference);
      if (next.done) {
        break;
      }
      yield* createVNodeWithContext(next.value, options);
    } while (!next.done);
  }
}
