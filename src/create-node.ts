import { VContext } from "./vcontext";
import {
  isSourceReference,
  SourceReference,
  Source,
  SourceReferenceRepresentationFactory,
  MarshalledSourceReference
} from "./source";
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
  getNext,
  asyncIterable
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
    return {
      reference: Fragment,
      children: functionGenerator(source)
    };
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
      children: promiseGenerator(source)
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
      children: childrenGenerator(context, ...children)
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
    return {
      reference: Fragment,
      children: unmarshalGenerator(source)
    };
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
    return {
      reference: Fragment,
      children: sourceReferenceGenerator(reference, source, options, ...children)
    };
  }

  /**
   * Here is our nice `IterableIterator` that allows us to produce multiple versions for the same source
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
    const childrenInstance = childrenGenerator(context, ...children);
    return {
      reference: Fragment,
      children: childrenGenerator(context, asyncExtendedIterable(source).map(value => createVNodeWithContext(context, value, options, childrenInstance)))
    };
  }

  /**
   * Allows for `undefined`, an empty `VNode`
   */
  if (!source) {
    return { reference: Fragment };
  }

  console.log(source, isVNode(source));

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
  async function *generator(newReference: SourceReference, reference: IterableIterator<SourceReference> | AsyncIterableIterator<SourceReference>): AsyncIterable<AsyncIterable<VNode>> {
    const childrenInstance = childrenGenerator(context, ...children);
    let next: IteratorResult<SourceReference>;
    do {
      next = await getNext(reference, newReference);
      if (next.done) {
        continue;
      }
      const node = createVNodeWithContext(context, next.value, options, childrenInstance);
      if (!isFragmentVNode(node) || !node.children) {
        // Let it do its thing
        yield asyncIterable([node]);
        continue;
      }
      // Flatten it out a little as we can match the expected structure
      for await (const children of node.children) {
        yield children;
      }
    } while (!next.done);
  }

  async function *promiseGenerator(promise: Promise<SourceReference | VNode>): AsyncIterable<AsyncIterable<VNode>> {
    const result = await promise;
    yield asyncIterable([
      createVNodeWithContext(context, result, options, ...children)
    ]);
  }

  async function *functionGenerator(source: SourceReferenceRepresentationFactory<O>): AsyncIterable<AsyncIterable<VNode>> {
    const nextSource = source(options, {
      reference: Fragment,
      children: childrenGenerator(context, ...children)
    });
    yield asyncIterable([
      createVNodeWithContext(context, nextSource, options, undefined)
    ]);
  }

  async function *unmarshalGenerator(source: MarshalledVNode): AsyncIterable<AsyncIterable<VNode>> {
    yield asyncIterable([
      unmarshal(source)
    ]);

    function unmarshal(source: MarshalledVNode | MarshalledSourceReference): VNode {
      if (isSourceReference(source)) {
        return sourceReferenceVNode(getReference(context), source);
      }
      if (!isMarshalledVNode(source)) {
        return source;
      }
      return {
        ...source,
        // Replace our reference if required
        reference: isSourceReference(source.reference) ? getMarshalledReference(context, source.reference) : getReference(context, source.options),
        children: asyncExtendedIterable(source.children).map(children => asyncExtendedIterable(children).map(unmarshal).toIterable()).toIterable()
      };
    }
  }

  async function *sourceReferenceGenerator(reference: SourceReference, source: SourceReference, options?: object, ...children: VNodeRepresentationSource[]): AsyncIterable<AsyncIterable<VNode>> {
    yield asyncIterable([
      sourceReferenceVNode(reference, source, options, ...children)
    ]);
  }

  function sourceReferenceVNode(reference: SourceReference, source: SourceReference, options?: object, ...children: VNodeRepresentationSource[]): VNode {
    return {
      reference: reference || getReference(context, options),
      scalar: true,
      source: source,
      options,
      children: childrenGenerator(context, ...children)
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
  return fromContext || Symbol("VNode");
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
