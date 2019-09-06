import {
  Source,
  getSourceReferenceDetail,
  SourceReferenceDetail,
  SourceReference,
  isPromise,
  isSourceReference, SourceReferenceRepresentation, isIterableIterator, isSourceReferenceDetail
} from "./source";
import { HydratedSourceOptions, SourceOptions } from "./source-options";
import { VContext } from "./vcontext";
import { isVNode, VNode, VNodeRepresentation } from "./vnode";
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

async function *generateChildren<C extends VContext, HO extends HydratedSourceOptions<C>>(context: VContext, options: HO, children: Iterable<VNodeRepresentation> | SourceReferenceRepresentation | VNodeRepresentation): AsyncIterable<VNode["reference"]> {
  for await (const node of generateChildrenVNodes(context, options, children)) {
    yield node.reference;
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
  let reference = detail.reference;
  if (isPromise(reference)) {
    reference = await reference;
  }
  if (isVNode(reference)) {
    return reference;
  }
  if (isAsyncIterable(reference)) {
    for await (const value of reference) {
      if (isSourceReference(value)) {
        yield await context.get(value);
      } else {
        yield* generateChildrenVNodes(context, options, value);
      }
    }
  } else if (isIterable(reference)) {
    for (const value of reference) {
      if (isSourceReference(value)) {
        yield await context.get(value);
      } else {
        yield* generateChildrenVNodes(context, options, value);
      }
    }
  } else {
    yield await context.get(reference);
  }
}

async function *hydrate<C extends VContext, HO extends HydratedSourceOptions<C>>(context: C, detail: SourceReferenceDetail, options: HO, children: Iterable<VNodeRepresentation>): AsyncIterable<VNode> {
  if (!isSourceReferenceDetail(detail)) {
    yield undefined;
    return;
  }

  let reference: SourceReferenceRepresentation = detail.reference;

  if (isPromise(reference)) {
    reference = await reference;
  }

  if (isVNode(reference)) {
    await context.set(reference.reference, reference);
    yield reference;
    return;
  }

  let referenced = new Set<SourceReference>();
  let remove = new Set<SourceReference>();

  async function hydrateVNode(reference: SourceReference, children: Iterable<VNodeRepresentation>): Promise<VNode> {
    const current = await context.get(reference);
    referenced = new Set<SourceReference>();
    remove = new Set<SourceReference>();
    const next: VNode = {
      reference,
      children: iterateChildren(
        asyncExtendedIterable(current ? current.children : [])[Symbol.asyncIterator](),
        generateChildren(context, options, children)[Symbol.asyncIterator]()
      )
    };
    await context.set(reference, next);
    for (const referenceToRemove of remove) {
      if (referenced.has(referenceToRemove) || referenceToRemove === reference) {
        continue;
      }
      await context.remove(referenceToRemove);
    }
    return next;
  }

  async function *iterateChildren(left: AsyncIterator<SourceReference>, right: AsyncIterator<SourceReference>): AsyncIterable<SourceReference> {
    let leftNext: IteratorResult<SourceReference>,
      rightNext: IteratorResult<SourceReference>;
    do {
      [leftNext, rightNext] = await Promise.all([
        getNext(left),
        getNext(right)
      ]);

      if (rightNext.done) {
        break;
      }

      const leftNode = isSourceReference(leftNext.value) ? await context.get(leftNext.value) : undefined;
      const rightNode = isSourceReference(rightNext.value) ? await context.get(rightNext.value) : undefined;

      if (leftNode && (!rightNode || leftNode.reference !== rightNode.reference)) {
        remove.add(leftNode.reference);
      }

      const leftChildren = asyncIterator(leftNode ? leftNode.children : []);
      const rightChildren = asyncIterator(rightNode ? rightNode.children : []);

      // Drain all children, don't emit as we only want the top level children
      await asyncDrain(iterateChildren(leftChildren, rightChildren));

      if (!rightNode) {
        yield undefined;
        continue;
      }

      referenced.add(rightNode.reference);

      yield rightNode.reference;
    } while (!rightNext.done);

    for await (const leftReference of restLeft()) {
      if (!isSourceReference(leftReference)) {
        continue;
      }
      if (referenced.has(leftNext.value)) {
        continue;
      }
      await context.remove(leftNext.value);
    }

    if (left.return) {
      await left.return();
    }
    if (right.return) {
      await right.return();
    }

    async function *restLeft() {
      while (!leftNext.done) {
        leftNext = await getNext(left);
        if (!isSourceReference(leftNext.value)) {
          continue;
        }
        const leftNode = await context.get(leftNext.value);
        if (!leftNode) {
          yield leftNext.value; // Already been removed
          continue;
        }
        yield* fromChildren(leftNode.children);
        yield leftNext.value;
      }

      async function *fromChildren(children: AsyncIterable<SourceReference>): AsyncIterable<SourceReference> {
        for await (const child of children) {
          const childNode = await context.get(child);
          if (!childNode) {
            yield child;
            continue;
          }
          yield* fromChildren(childNode.children);
          yield child;
        }
      }
    }
  }

  let vNode: VNode | AsyncIterable<VNode>;

  const iterable = isIterable(reference) || isAsyncIterable(reference);

  if (isSourceReference(reference)) {
    vNode = await hydrateVNode(reference, children);
  } else if (iterable && !isIterableIterator(reference)) {
    vNode = await hydrateVNode(Fragment, children);
  } else if (iterable && isIterableIterator(reference)) {
    vNode = generator(Symbol(), reference);
  }

  if (isAsyncIterable(vNode)) {
    for await (const nextVNode of vNode) {
      yield nextVNode;
    }
  } else {
    yield vNode;
  }

  async function *generator(newReference: SourceReference, reference: IterableIterator<SourceReference> | AsyncIterableIterator<SourceReference>): AsyncIterableIterator<VNode> {
    let next: IteratorResult<SourceReference> | Promise<IteratorResult<SourceReference>>;
    do {
      next = await getNext(reference, newReference);
      if (next.done) {
        break;
      }
      const detail = getSourceReferenceDetail(context, next.value, options);
      yield* hydrate(context, detail, options, children);
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

  return async function *h<O extends SourceOptions<C>>(source: Source<C, O>, options: O, children: VNodeRepresentation, ...additionalChildren: VNodeRepresentation[]): AsyncIterable<VNode> {
    const contextResult: IteratorResult<C> = options.context ? { done: false, value: options.context } : await contextAccessor.next();
    if (contextResult.done) {
      return undefined;
    }
    const context = contextResult.value;
    const hydratedOptions: O & HydratedSourceOptions<C> = {
      ...options,
      context
    };
    const reference = getSourceReferenceDetail(context, source, hydratedOptions);
    if (!reference) {
      throw new Error("Unable to retrieve reference representation");
    }
    let allChildren: Iterable<VNodeRepresentation> = [
      children
    ];
    if (additionalChildren.length) {
      allChildren = [
        children,
        ...additionalChildren
      ];
    }
    yield* hydrate(context, reference, hydratedOptions, allChildren);
  };
}
