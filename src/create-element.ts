import { VContext } from "./vcontext";
import { ContextSourceOptions } from "./source-options";
import {
  getSourceReferenceDetail,
  isIterableIterator,
  isPromise, isSourceReference,
  isSourceReferenceDetail,
  SourceReference,
  SourceReferenceDetail,
  SourceReferenceRepresentation,
  Source
} from "./source";
import {
  getScalar,
  HydratableVNode,
  isNativeVNode,
  isScalarVNode,
  isVNode,
  ScalarVNode,
  VNode,
  VNodeRepresentation
} from "./vnode";
import { asyncExtendedIterable, isAsyncIterable, isIterable } from "iterable";
import { flattenAndGet } from "./flatten";
import { generateChildren, generateChildrenVNodes } from "./children";
import { getNext } from "./retry-iterator";

export async function *createElementWithContext<C extends VContext, HO extends ContextSourceOptions<C>>(source: Source<C, unknown> | SourceReferenceDetail, options: HO): AsyncIterable<VNode | undefined> {
  const detail = isSourceReferenceDetail(source) ? source : getSourceReferenceDetail(options.context, source, options);

  if (!isSourceReferenceDetail(detail)) {
    return yield undefined;
  }

  let componentReference: SourceReferenceRepresentation = detail.reference;

  if (isPromise(componentReference)) {
    componentReference = await componentReference;
  }

  if (isVNode(componentReference)) {
    return yield* flattenAndGet(options.context, componentReference, options);
  }

  async function hydrateVNode(componentReference: SourceReference, children: VNodeRepresentation): Promise<VNode | HydratableVNode<C, HO> | ScalarVNode> {
    const native = options.context.getNative ? await options.context.getNative(componentReference) : undefined;
    if (isNativeVNode(native)) {
      const nextNative = {
        ...native,
        reference: options.reference,
        options
      };
      await options.context.set(options.reference, nextNative);
      return nextNative;
    }
    const scalar = await getScalar(options, componentReference);
    if (scalar) {
      return scalar;
    }
    const next: HydratableVNode<C, HO> = {
      reference: options.reference,
      source: undefined,
      options,
      children: asyncExtendedIterable(generateChildren(options.context, options, children)).retain()
    };
    next.source = next;
    await options.context.set(next.reference, next);
    return next;
  }

  let vNode: VNode | AsyncIterable<VNode>;

  const iterable = isIterable(componentReference) || isAsyncIterable(componentReference);

  if (isSourceReference(componentReference)) {
    vNode = await hydrateVNode(componentReference, options.children);
  } else if (iterable && !isIterableIterator(componentReference)) {
    vNode = await hydrateVNode(options.reference, asyncExtendedIterable(generateChildrenVNodes(options.context, options, componentReference)).retain());
  } else if (iterable && isIterableIterator(componentReference)) {
    vNode = generator(Symbol("Iterable Iterator"), componentReference);
  }

  if (isAsyncIterable(vNode)) {
    for await (const nextVNode of vNode) {
      if (!isVNode(nextVNode)) {
        yield undefined;
      } else {
        yield* flattenAndGet(options.context, nextVNode, options);
      }
    }
  } else if (isVNode(vNode)) {
    yield* flattenAndGet(options.context, vNode, options);
  }

  async function *generator(newReference: SourceReference, reference: IterableIterator<SourceReference> | AsyncIterableIterator<SourceReference>): AsyncIterableIterator<VNode> {
    let next: IteratorResult<SourceReference> | Promise<IteratorResult<SourceReference>>;
    do {
      next = await getNext(reference, newReference);
      if (next.done) {
        break;
      }
      const detail = getSourceReferenceDetail(options.context, next.value, options);
      yield* createElementWithContext(detail, options);
    } while (!next.done);
  }
}
