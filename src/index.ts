import {
  Source,
  getSourceReferenceDetail,
  SourceReferenceDetail,
  SourceReference,
  isPromise,
  isSourceReference,
  SourceReferenceRepresentation,
  isSourceReferenceDetail,
  isIterableIterator
} from "./source";
import { HydratedSourceOptions, SourceOptions } from "./source-options";
import { VContext, isNativeVContext } from "./vcontext";
import {
  HydratableVNode,
  isHydratableVNode,
  isNativeVNode,
  isScalarVNode,
  isVNode,
  VNode,
  VNodeRepresentation
} from "./vnode";
import {
  asyncDrain,
  asyncExtendedIterable,
  AsyncIterableLike,
  asyncIterator,
  isAsyncIterable,
  isIterable
} from "iterable";

export const Fragment = Symbol("Fragment");

export * from "./source";
export * from "./source-options";
export * from "./vcontext";
export * from "./vnode";

async function assertNonNative(context: VContext, reference: SourceReference, message?: string): Promise<void> {
  if (!isNativeVContext(context)) {
    return;
  }
  if (await context.isNative(reference)) {
    throw new Error(message || "Found native reference when not expected");
  }
}

async function *flatten<C extends VContext, HO extends HydratedSourceOptions<C>>(context: C, node: unknown, options: HO): AsyncIterable<SourceReference> {
  if (isSourceReference(node)) {
    await assertNonNative(context, node, "flatten found non reference");
    return yield node;
  }
  if (!isVNode(node)) {
    return;
  }
  if (node.reference !== Fragment) {
    return yield* flatten(context, node.reference, options);
  }
  for await (const reference of node.children) {
    yield* flatten(context, reference, options);
  }
}

async function *flattenAndGet<C extends VContext, HO extends HydratedSourceOptions<C>>(context: C, node: unknown, options: HO): AsyncIterable<VNode> {
  for await (const value of flatten(context, node, options)) {
    if (!isSourceReference(value)) {
      yield undefined;
    } else {
      yield await context.get(value);
    }
  }
}

async function *generateChildren<C extends VContext, HO extends HydratedSourceOptions<C>>(context: VContext, options: HO, children: Iterable<VNodeRepresentation> | SourceReferenceRepresentation | VNodeRepresentation): AsyncIterable<VNode["reference"]> {
  for await (const node of generateChildrenVNodes(context, options, children)) {
    yield isVNode(node) ? node.reference : undefined;
  }
}

async function getNext<T>(iterator: Iterator<T> | AsyncIterator<T>, value?: any): Promise<IteratorResult<T>> {
  let next: IteratorResult<T> | Promise<IteratorResult<T>>;
  try {
    next = iterator.next(value);
    if (isPromise(next)) {
      next = await next;
    }
    if (next.done) {
      if (iterator.return) {
        next = iterator.return(value);
        if (isPromise(next)) {
          next = await next;
        }
      }
    }
    return next;
  } catch (e) {
    if (!iterator.throw) {
      throw e;
    }
    next = iterator.throw(e);
    if (isPromise(next)) {
      next = await next;
    }
    return next;
  }
}

async function *generateChildrenVNodes<C extends VContext,  HO extends HydratedSourceOptions<C>>(context: VContext, options: HO, children: Iterable<VNodeRepresentation> | SourceReferenceRepresentation | VNodeRepresentation): AsyncIterable<VNode> {
  const detail = getSourceReferenceDetail(context, children, options);
  if (!isSourceReferenceDetail(detail)) {
    return yield undefined;
  }
  let reference = detail.reference;
  if (isPromise(reference)) {
    reference = await reference;
  }
  if (isVNode(reference)) {
    await assertNonNative(context, reference.reference);
    return yield reference;
  }
  if (isAsyncIterable(reference)) {
    for await (const value of reference) {
      if (isSourceReference(value)) {
        await assertNonNative(context, value);
        yield await context.get(value);
      } else {
        yield* generateChildrenVNodes(context, options, value);
      }
    }
  } else if (isIterable(reference)) {
    for (const value of reference) {
      if (isSourceReference(value)) {
        await assertNonNative(context, value);
        yield await context.get(value);
      } else {
        yield* generateChildrenVNodes(context, options, value);
      }
    }
  } else {
    await assertNonNative(context, reference);
    yield await context.get(reference);
  }
}

async function *hydrate<C extends VContext, HO extends HydratedSourceOptions<C>>(context: C, detail: SourceReferenceDetail, options: HO): AsyncIterable<VNode | undefined> {
  if (!isSourceReferenceDetail(detail)) {
    return yield undefined;
  }

  let componentReference: SourceReferenceRepresentation = detail.reference;

  if (isPromise(componentReference)) {
    componentReference = await componentReference;
  }

  let referenced = new Map<SourceReference, VNode>();
  let remove = new Set<SourceReference>();

  if (isVNode(componentReference)) {
    return yield* flattenAndGet(context, componentReference, options);
  }

  async function hydrateVNode(componentReference: SourceReference, children: VNodeRepresentation): Promise<VNode | HydratableVNode<C, HO>> {
    // Native skip back to current
    referenced = new Map<SourceReference, VNode>();
    remove = new Set<SourceReference>();
    const native = context.getNative ? await context.getNative(componentReference) : undefined;
    if (isNativeVNode(native)) {
      const nextNative = {
        ...native,
        reference: options.reference,
        options
      };
      referenced.set(options.reference, nextNative);
      await context.set(options.reference, nextNative);
      return nextNative;
    }
    if (isSourceReference(componentReference)) {
      const possibleScalar = await context.get(componentReference);
      if (isScalarVNode(possibleScalar)) {
        return possibleScalar;
      }
    }
    const next: HydratableVNode<C, HO> = {
      reference: options.reference,
      source: undefined,
      options,
      children: asyncExtendedIterable(generateChildren(context, options, children)).retain()
    };
    next.source = next;
    referenced.set(next.reference, next);
    await context.set(next.reference, next);
    return next;
  }

  let vNode: VNode | AsyncIterable<VNode>;

  const iterable = isIterable(componentReference) || isAsyncIterable(componentReference);

  if (isSourceReference(componentReference)) {
    vNode = await hydrateVNode(componentReference, options.children);
  } else if (iterable && !isIterableIterator(componentReference)) {
    vNode = await hydrateVNode(options.reference, asyncExtendedIterable(generateChildrenVNodes(context, options, componentReference)).retain());
  } else if (iterable && isIterableIterator(componentReference)) {
    vNode = generator(Symbol("Iterable Iterator"), componentReference);
  }

  if (isAsyncIterable(vNode)) {
    for await (const nextVNode of vNode) {
      if (!isVNode(nextVNode)) {
        yield undefined;
      } else {
        yield {
          reference: Fragment,
          children: flatten(context, nextVNode, options)
        };
      }
    }
  } else if (isVNode(vNode)) {
    yield {
      reference: Fragment,
      children: flatten(context, vNode, options)
    };
  }

  async function *generator(newReference: SourceReference, reference: IterableIterator<SourceReference> | AsyncIterableIterator<SourceReference>): AsyncIterableIterator<VNode> {
    let next: IteratorResult<SourceReference> | Promise<IteratorResult<SourceReference>>;
    do {
      next = await getNext(reference, newReference);
      if (next.done) {
        break;
      }
      const detail = getSourceReferenceDetail(context, next.value, options);
      yield* hydrate(context, detail, options);
    } while (!next.done);
  }
}

export function createHydrator<C extends VContext>(contextSource: C | AsyncIterableLike<C> | IterableIterator<C> | AsyncIterableIterator<C>) {
  async function *contextGenerator(): AsyncIterable<C> {
    if (!(isIterable(contextSource) || isAsyncIterable(contextSource))) {
      while (true) {
        yield contextSource;
      }
    } else {
      let next: IteratorResult<C> | Promise<IteratorResult<C>>;
      const iterator = isIterableIterator(contextSource) ? contextSource : isAsyncIterable(contextSource) ? contextSource[Symbol.asyncIterator]() : contextSource[Symbol.iterator]();
      do {
        next = await getNext(iterator);
        if (next.done) {
          break;
        }
        yield next.value;
      } while (!next.done);
    }
  }
  const contextAccessor = contextGenerator()[Symbol.asyncIterator]();

  return async function *h<O extends SourceOptions<C>>(source: Source<C, O>, options?: O, children?: VNodeRepresentation, ...additionalChildren: VNodeRepresentation[]): AsyncIterable<VNode | undefined> {
    const contextResult: IteratorResult<C> = (options && options.context) ? { done: false, value: options.context } : await contextAccessor.next();
    if (contextResult.done) {
      return undefined;
    }
    const context = contextResult.value;
    let allChildren: Iterable<VNodeRepresentation> = [
      children
    ];
    if (additionalChildren.length) {
      allChildren = [
        children,
        ...additionalChildren
      ];
    }
    const reference = options.reference || Symbol("Element");
    const baseHydratedOptions: O & HydratedSourceOptions<C> = {
      ...options,
      reference: reference,
      context: await context.isolate(reference),
      children: []
    };
    const hydratedOptions: O & HydratedSourceOptions<C> = {
      ...baseHydratedOptions,
      children: generateChildren(context, baseHydratedOptions, allChildren)
    };
    const detail = getSourceReferenceDetail(context, source, hydratedOptions);
    if (!reference) {
      throw new Error("Unable to retrieve reference representation");
    }
    for await (const node of hydrate(context, detail, hydratedOptions)) {
      for await (const reference of flatten(context, node, hydratedOptions)) {
        yield await context.get(reference);
      }
    }
  };
}
