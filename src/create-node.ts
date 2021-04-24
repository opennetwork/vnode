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
  isVNode,
  MarshalledVNode,
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

// Access to re-assign a functional vnode child between children reads
export const Child = Symbol("Function VNode Child");

export type CreateNodeFragmentSource =
  | AsyncIterable<unknown>
  | Iterable<unknown>
  | IterableIterator<unknown>
  | Function
  | Promise<unknown>
  | FragmentVNode
  | typeof Fragment
  | undefined
  | null;

export interface CreateNodeFn<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  Output extends VNode = VNode
  > {
  <Input extends FragmentVNode>(source: Input, ...throwAway: unknown[]): Input;
  <Input extends VNode>(source: Input, ...throwAway: unknown[]): Input;
  <TO extends O, S extends CreateNodeFragmentSource>(source: S): FragmentVNode & {
    source: S;
    options: never;
    children: never;
  };
  <S extends CreateNodeFragmentSource>(source: S): FragmentVNode & {
    source: S;
    options: never;
    children: never;
  };
  <TO extends O, S extends CreateNodeFragmentSource>(source: S, options: TO): FragmentVNode & {
    source: S;
    options: TO;
    children: never;
  };
  <TO extends O, S extends CreateNodeFragmentSource>(source: S, options?: TO, ...children: C[]): FragmentVNode & {
    source: S;
    options: TO;
  };
  <TO extends O, S extends SourceReference>(source: S): VNode & {
    source: S;
    options: never;
    scalar: true;
    children: never;
  };
  <TO extends O, S extends SourceReference>(source: S, options?: TO): VNode & {
    source: S;
    options: TO;
    scalar: true;
    children: never;
  };
  <TO extends O, S extends SourceReference>(source: S, options?: TO, ...children: C[]): VNode & {
    source: S;
    options: TO;
    scalar: false;
  };
  <TO extends O>(source: S, options?: TO, ...children: C[]): Output;
}


export type CreateNodeFnUndefinedOptionsCatch<
  Test extends (source: CreateNodeFragmentSource) => FragmentVNode & { source: CreateNodeFragmentSource, options: never }> = Test;
export type CreateNodeFnGivenOptionsCatch<
  Test extends (source: CreateNodeFragmentSource, options: { key: "value" }) => FragmentVNode & { source: CreateNodeFragmentSource, options: { key: "value" } }> = Test;

type ThrowAwayCreateNodeFnUndefinedOptionsCatch = CreateNodeFnUndefinedOptionsCatch<typeof createNode>;
type ThrowAwayCreateNodeFnGivenOptionsCatch = CreateNodeFnGivenOptionsCatch<typeof createNode>;

export type CreateNodeFnCatch<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  Output extends VNode = VNode,
  Test extends CreateNodeFn<O, S, C, Output> = CreateNodeFn<O, S, C, Output>
  > = Test;

// This will throw if createNode doesn't match the type for CreateNodeFn, this gives us type safety :)
type TestThrow = CreateNodeFnCatch<
  object,
  Source<object>,
  VNodeRepresentationSource,
  VNode,
  typeof createNode
>;

/**
 * Generates instances of {@link FragmentVNode} based on the provided source
 *
 * See {@link Source} for an explanation on each type and how they are represented as a {@link VNode}
 *
 * The provided {@link VContext} may override this functionality, possibly resulting in a {@link NativeVNode}
 *
 * The special case to point out here is if the source is an `IterableIterator` (see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#Is_a_generator_object_an_iterator_or_an_iterable})
 * then each iteration will result in a new {@link VNode} being created
 */
export function createNode<Input extends FragmentVNode>(source: Input, ...throwAway: unknown[]): Input;
export function createNode<Input extends VNode = VNode>(source: Input, ...throwAway: unknown[]): Input;
export function createNode<O extends object = object, S extends CreateNodeFragmentSource = CreateNodeFragmentSource>(source: S, options?: O, ...children: VNodeRepresentationSource[]): FragmentVNode & {
  source: S;
  options: O;
};
export function createNode<O extends object = object, S extends CreateNodeFragmentSource = CreateNodeFragmentSource>(source: S, options?: O, ...children: VNodeRepresentationSource[]): FragmentVNode & {
  source: S;
  options: O;
};
export function createNode<O extends object = object, S extends SourceReference = SourceReference>(source: S, options?: O): VNode & {
  source: S;
  options: O;
  scalar: boolean;
  children: never;
};
export function createNode<O extends object = object, S extends SourceReference = SourceReference>(source: S, options?: O, ...children: VNodeRepresentationSource[]): VNode & {
  source: S;
  options: O;
  scalar: boolean;
};
export function createNode<O extends object = object>(source: Source<O>, options?: O, ...children: VNodeRepresentationSource[]): VNode;
export function createNode<O extends object = object>(source: Source<O>, options?: O, ...children: VNodeRepresentationSource[]): VNode {
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
      source,
      reference: Fragment,
      children: replay(() => promiseGenerator(source))
    };
  }

  /**
   * If we have a fragment then we want to pass it back through our function so the next
   * statement is invoked to handle fragments with children
   */
  if (source === Fragment) {
    return createNode({ reference: Fragment, source }, options, ...children);
  }
  /**
   * If we already have a {@link VNode} then we don't and can't do any more
   */
  if (isVNode(source)) {
    let nextSource: VNode = source;
    /**
     * Extend our vnode options if we have been provided them
     * Each property that is not passed will match the initial property
     */
    if (options && source.options !== options) {
      nextSource = {
        ...nextSource,
        options: {
          ...nextSource.options,
          ...options
        }
      };
    }
    /**
     * Replace children if they have been given and the source doesn't already have children
     */
    if (children.length && !nextSource.children) {
      nextSource = {
        ...nextSource,
        children: replay(() => childrenGenerator(createNode, ...children))
      };
    }
    return nextSource;
  }

  /**
   * If we already have a {@link MarshalledVNode} then we need to turn its children into an async iterable
   * and ensure they're unmarshalled
   */
  if (isMarshalledVNode(source)) {
    return unmarshal(source);
  }

  const reference = getReference(options);

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
      source,
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
    const childrenInstance = childrenGenerator(createNode, ...children);
    return {
      source,
      reference: Fragment,
      children: replay(() => childrenGenerator(createNode, asyncExtendedIterable(source).map(value => createNode(value, options, childrenInstance))))
    };
  }

  /**
   * Allows for `undefined`, an empty `VNode`
   */
  if (!source) {
    return { reference: Fragment, source };
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
    const childrenInstance = childrenGenerator(createNode, ...children);
    let next: IteratorResult<SourceReference>;
    do {
      next = await getNext(reference, newReference);
      if (next.done) {
        continue;
      }
      const node = createNode(next.value, options, childrenInstance);
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
      createNode(result, options, ...children)
    ]);
  }

  function functionVNode(source: SourceReferenceRepresentationFactory<O>): VNode {
    const defaultOptions = {};
    const resolvedOptions = isDefaultOptionsO(defaultOptions) ? defaultOptions : options;

    const node: VNode & {
      [Child]?: VNode,
      source: typeof source,
      options: typeof resolvedOptions
    } = {
      reference: Fragment,
      source,
      options: resolvedOptions,
      children: replay(() => functionAsChildren()),
    };
    return node;

    async function *functionAsChildren(): AsyncIterable<ReadonlyArray<VNode>> {
      const options = node.options;
      const source = node.source;

      // Lazy create the children when the function is first invoked
      // This allows children to be a bit more dynamic
      //
      // We will only provide a child to node.source if we have at least one child provided
      const child = node[Child] = node[Child] ?? children.length ? createNode(Fragment, {}, ...children) : undefined;

      // Referencing node here allows for external to update the nodes implementation on the fly...
      const nextSource = source(options, child);
      // If the nextSource is the same as node.source, then we should finish here, it will always return itself
      // If node.source returns a promise then we can safely assume this was intentional as a "loop" around
      // A function can also return an iterator (async or sync) that returns itself too
      //
      // This is to only detect hard loops
      // We will also reference the different dependency here, as they might have been re-assigned,
      // meaning the possible return from this function has changed, meaning the return value could be different
      const possibleMatchingSource: unknown = nextSource;
      if (
        possibleMatchingSource !== source ||
        source !== node.source ||
        options !== node.options ||
        child !== node[Child]
      ) {
        yield [
          createNode(nextSource)
        ];
      }
    }

    function isDefaultOptionsO(value: unknown): value is O {
      return value === defaultOptions && !options;
    }
  }

  function unmarshal(source: MarshalledVNode): VNode {
    if (isSourceReference(source)) {
      return sourceReferenceVNode(getReference(), source);
    }
    return {
      ...source,
      // Replace our reference if required
      reference: isSourceReference(source.reference) ? getMarshalledReference(source.reference) : getReference(source.options),
      children: source.children ? replay(() => asyncExtendedIterable(source.children).map(children => Object.freeze([...children].map(unmarshal))).toIterable()) : undefined
    };
  }

  function sourceReferenceVNode(reference: SourceReference, source: SourceReference, options?: object, ...children: VNodeRepresentationSource[]): VNode {
    return {
      reference: reference || getReference(options),
      scalar: !children.length,
      source,
      options,
      children: children.length ? replay(() => childrenGenerator(createNode, ...children)) : undefined
    };
  }

  function replay<T>(fn: () => AsyncIterable<T>): AsyncIterable<T> {
    return {
      [Symbol.asyncIterator]: () => fn()[Symbol.asyncIterator]()
    };
  }

}

function getMarshalledReference(reference: MarshalledSourceReference): SourceReference {
  return getReference({
    reference
  });
}

function getReference(options?: object) {
  return getReferenceFromOptions(options) ?? Symbol("@opennetwork/vnode");
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
