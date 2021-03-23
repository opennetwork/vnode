import { VContext } from "./vcontext";
import {
  Source,
  SourceReferenceRepresentationFactory
} from "./source";
import {
  isSourceReference,
  SourceReference,
  MarshalledSourceReference
} from "./source-reference";
import {
  FragmentVNode,
  isFragmentVNode,
  isMarshalledVNode,
  isVNode, MarshalledVNode,
  VNode,
  VNodeRepresentationSource
} from "./vnode";
import {
  isAsyncIterable,
  isIterable,
  isPromise,
  asyncExtendedIterable,
  isIterableIterator,
  getNext
} from "iterable";
import { children as childrenGenerator } from "./children";
import { Fragment } from "./fragment";

/**
 * Generates instances of {@link FragmentVNode} based on the provided source
 *
 * See {@link Source} for an explanation on each type and how they are represented as a {@link VNode}
 *
 * The provided {@link VContext} may override this functionality, possibly resulting in a {@link NativeVNode}
 *
 * The special case to point out here is if the source is an `IterableIterator` (see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#Is_a_generator_object_an_iterator_or_an_iterable})
 * then each iteration will result in a new {@link VNode} being created
 *
 * @param context
 * @param source
 * @param options
 * @param children
 */
export function createVNodeWithContext<O extends object>(context: VContext, source: Source<O>, options?: O, ...children: VNodeRepresentationSource[]): VNode {
  /**
   * Allow {@link VContext} to override the _createVNode_ process
   *
   * This is where a context would inject its native types
   *
   * The result returned is either going to be an `AsyncIterable` or `undefined`
   *
   * If it is `undefined` the context is indicating that we can continue as normal
   */
  if (typeof context.createVNode === "function") {
    const result = context.createVNode(source, options);
    if (result) {
      return result;
    }
  }

  /**
   * If the source is a function we're going to invoke it as soon as possible with the provided options
   *
   * The function _may_ return any other kind of source, so we need to start our process again
   */
  if (source instanceof Function) {
    return functionVNode(source);
  }

  /**
   * Only if the source is a promise we want to await it
   *
   * This may be wasteful, but the idea is that we wouldn't cause a next tick for no reason
   * Maybe this isn't the case if the value isn't a promise to start with ¯\_(ツ)_/¯
   */
  if (isPromise(source)) {
    return {
      reference: Fragment,
      children: replay(() => promiseGenerator(source))
    };
  }

  /**
   * If we have a fragment then we want to pass it back through our function so the next
   * statement is invoked to handle fragments with children
   */
  if (source === Fragment) {
    return createVNodeWithContext(context, { reference: Fragment }, options, ...children);
  }

  /**
   * This allows fragments to be extended with children
   */
  if (isFragmentVNode(source) && !source.children) {
    // If a fragment has no children then we will attach our children to it
    return {
      ...source,
      children: replay(() => childrenGenerator(createVNodeWithContext, context, ...children))
    };
  }

  /**
   * If we already have a {@link VNode} then we don't and can't do any more
   */
  if (isVNode(source)) {
    return source;
  }

  /**
   * If we already have a {@link MarshalledVNode} then we need to turn its children into an async iterable
   * and ensure they're unmarshalled
   */
  if (isMarshalledVNode(source)) {
    return unmarshal(source);
  }

  const reference = getReference(context, options);

  /**
   * A source reference may be in reference to a context we don't know about, this can be resolved from
   * external contexts by rolling through the {@link VNode} state, or watching context events
   *
   * This could be used by analytics tracking for tags that show up
   *
   * Either way, if we have a source reference, we have a primitive value that we can look up later on
   */
  if (isSourceReference(source)) {
    return sourceReferenceVNode(reference, source, options, ...children);
  }

  /**
   * Here is our nice `IterableIterator` that allows us to produce multiple versions for the same source
   *
   * This specifically cannot be re-run twice, but this is expected to be returned from a function, where
   * functions can be run twice
   *
   * See {@link generator} for details
   */
  if (isIterableIterator(source)) {
    return {
      reference: Fragment,
      children: generator(Symbol("Iterable Iterator"), source)
    };
  }

  /**
   * This will cover `Array`, `Set`, `Map`, and anything else implementing `Iterable` or `AsyncIterable`
   *
   * We will create a `Fragment` that holds our node state to grab later
   */
  if (isIterable(source) || isAsyncIterable(source)) {
    const childrenInstance = childrenGenerator(createVNodeWithContext, context, ...children);
    return {
      reference: Fragment,
      children: replay(() => childrenGenerator(createVNodeWithContext, context, asyncExtendedIterable(source).map(value => createVNodeWithContext(context, value, options, childrenInstance))))
    };
  }

  /**
   * Allows for `undefined`, an empty `VNode`
   */
  if (!source) {
    return { reference: Fragment };
  }

  /**
   * We _shouldn't_ get here AFAIK, each kind of source should have been dealt with by the time we get here
   */
  throw new Error("Unexpected VNode source provided");

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
  async function *generator(newReference: SourceReference, reference: IterableIterator<SourceReference> | AsyncIterableIterator<SourceReference>): AsyncIterable<ReadonlyArray<VNode>> {
    const childrenInstance = childrenGenerator(createVNodeWithContext, context, ...children);
    let next: IteratorResult<SourceReference>;
    do {
      next = await getNext(reference, newReference);
      if (next.done) {
        continue;
      }
      const node = createVNodeWithContext(context, next.value, options, childrenInstance);
      if (!isFragmentVNode(node) || !node.children) {
        // Let it do its thing
        yield Object.freeze([node]);
      } else {
        yield* node.children;
      }
    } while (!next.done);
  }

  async function *promiseGenerator(promise: Promise<SourceReference | VNode>): AsyncIterable<ReadonlyArray<VNode>> {
    const result = await promise;
    yield Object.freeze([
      createVNodeWithContext(context, result, options, ...children)
    ]);
  }

  function functionVNode(source: SourceReferenceRepresentationFactory<O>): VNode {
    return {
      reference: Fragment,
      children: replay(() => functionAsChildren())
    };

    async function *functionAsChildren(): AsyncIterable<ReadonlyArray<VNode>> {
      const nextSource = source(options, createVNodeWithContext(context, Fragment, {}, ...children));
      yield Object.freeze([
        createVNodeWithContext(context, nextSource, options, undefined)
      ]);
    }
  }

  function unmarshal(source: MarshalledVNode): VNode {
    if (isSourceReference(source)) {
      return sourceReferenceVNode(getReference(context), source);
    }
    return {
      ...source,
      // Replace our reference if required
      reference: isSourceReference(source.reference) ? getMarshalledReference(context, source.reference) : getReference(context, source.options),
      children: replay(() => asyncExtendedIterable(source.children).map(children => Object.freeze([...children].map(unmarshal))).toIterable())
    };
  }

  function sourceReferenceVNode(reference: SourceReference, source: SourceReference, options?: object, ...children: VNodeRepresentationSource[]): VNode {
    return {
      reference: reference || getReference(context, options),
      scalar: true,
      source: source,
      options,
      children: replay(() => childrenGenerator(createVNodeWithContext, context, ...children))
    };
  }

  function replay<T>(fn: () => AsyncIterable<T>): AsyncIterable<T> {
    return {
      [Symbol.asyncIterator]: () => fn()[Symbol.asyncIterator]()
    };
  }

}

function getMarshalledReference(context: VContext, reference: MarshalledSourceReference): SourceReference {
  if (context.reference) {
    return context.reference(reference);
  }
  return reference;
}

function getReference(context: VContext, options?: object) {
  const fromOptions = getReferenceFromOptions(options);
  const fromContext = context.reference ? context.reference(fromOptions) : fromOptions;
  return fromContext || Symbol("@opennetwork/vnode");
}

function isReferenceOptions(options: object): options is object & { reference: SourceReference } {
  function isReferenceOptionsLike(options: object): options is object & { reference?: unknown } {
    return options && options.hasOwnProperty("reference");
  }
  return (
    isReferenceOptionsLike(options) &&
    isSourceReference(options.reference)
  );
}

function getReferenceFromOptions(options: object | undefined): SourceReference {
  if (!isReferenceOptions(options)) {
    return undefined;
  }
  return options.reference;
}
