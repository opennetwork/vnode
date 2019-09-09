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
import { children } from "./children";
import { Fragment } from "./fragment";

/**
 * Generates instances of {@link VNode} based on the provided source
 *
 * See {@link Source} for an explanation on each type and how they are represented as a {@link VNode}
 *
 * The provided {@link VContext} may override this functionality, possibly resulting in a {@link NativeVNode}
 *
 * The special case to point out here is if the source is an `IterableIterator` (see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#Is_a_generator_object_an_iterator_or_an_iterable})
 * then each iteration will result in a new {@link VNode} being created
 *
 * @param source
 * @param options
 */
export async function *createVNodeWithContext<C extends VContext, HO extends ContextSourceOptions<C>>(source: Source<C, unknown>, options: HO): AsyncIterable<VNode> {
  /**
   * Allow {@link VContext} to override the _createVNode_ process
   *
   * This is where a context would inject its native types
   *
   * The result returned is either going to be an `AsyncIterable` or `undefined`
   *
   * If it is `undefined` the context is indicating that we can continue as normal
   */
  if (typeof options.context.createVNode === "function") {
    const result = options.context.createVNode(source, options);
    if (result) {
      return yield* result;
    }
  }

  /**
   * If the source is a function we're going to invoke it as soon as possible with the provided options
   *
   * The function _may_ return any other kind of source, so we need to start our process again
   */
  if (source instanceof Function) {
    const nextSource = source({
      ...options
    });
    return yield* createVNodeWithContext(nextSource, options);
  }

  /**
   * Only if the source is a promise we want to await it
   *
   * This may be wasteful, but the idea is that we wouldn't cause a next tick for no reason
   * Maybe this isn't the case if the value isn't a promise to start with ¯\_(ツ)_/¯
   */
  if (isPromise(source)) {
    source = await source;
  }

  /**
   * If we already have a {@link VNode} then we don't and can't do any more
   */
  if (isVNode(source)) {
    return yield source;
  }

  /**
   * A source reference may be in reference to a context we don't know about, this can be resolved from
   * external contexts by rolling through the {@link VNode} state, or watching context events
   *
   * This could be used by analytics tracking for tags that show up
   *
   * Either way, if we have a source reference, we have a primitive value that we can look up later on
   */
  if (isSourceReference(source)) {
    return yield {
      reference: options.reference,
      scalar: true,
      source: source,
      options,
      children: children(options)
    };
  }

  /**
   * Here is our nice `IterableIterator` that allows us to produce multiple versions for the same source
   *
   * See {@link generator} for details
   */
  if (isIterableIterator(source)) {
    return yield* generator(Symbol("Iterable Iterator"), source);
  }

  /**
   * This will cover `Array`, `Set`, `Map`, and anything else implementing `Iterable` or `AsyncIterable`
   *
   * We will create a `Fragment` that holds our node state to grab later
   *
   * This _could_ be flattened using {@link flatten} if needed before it is used as a child
   */
  if (isIterable(source) || isAsyncIterable(source)) {
    return yield {
      reference: Fragment,
      children: children(options, asyncExtendedIterable(source).map(value => createVNodeWithContext(value, options)))
    };
  }

  /**
   * Allows for `undefined
   */
  if (!source) {
    // Empty VNode
    return yield undefined;
  }

  /**
   * We _shouldn't_ get here AFAIK, each kind of source should have been dealt with by the time we get here
   *
   * I'm leaving this here so that in the future if we do implement additional source types, it will "just work"
   */
  return yield {
    reference: options.reference,
    source,
    options,
    children: children(options)
  };

  /**
   * Iterates through an `IterableIterator` to generate new {@link VNode} instances
   *
   * This allows an implementor to decide when their node returns state, including pushing new values _as they arrive_
   *
   * {@link getNext} provides an error boundary if the `IterableIterator` provides a `throw` function
   *
   * @param newReference
   * @param reference
   */
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
