import { AsyncIterableLike, isAsyncIterable, isIterable } from "iterable";
import { SourceOptions, ContextSourceOptions } from "./source-options";
import { VContext } from "./vcontext";
import { isVNode, VNodeRepresentation } from "./vnode";

export type SourceReference = string | symbol | number;
export type AsyncSourceReferenceRepresentation = VNodeRepresentation | Promise<SourceReference> | AsyncIterable<SourceReference>;
export type SyncSourceReferenceRepresentation = SourceReference | Iterable<SourceReference>;
export type SourceReferenceRepresentation = AsyncSourceReferenceRepresentation | SyncSourceReferenceRepresentation;
export type SourceReferenceFactory<C extends VContext, O extends SourceOptions<C>> = (options: O & ContextSourceOptions<C>) => SourceReferenceRepresentation;
export type SourceReferenceLike<C extends VContext, O extends SourceOptions<C>> = SourceReferenceRepresentation | SourceReferenceFactory<C, O>;
export type BasicSource<C extends VContext, O extends SourceOptions<C>> = SourceReferenceLike<C, O> | AsyncIterableLike<SourceReferenceLike<C, O>>;
export type Source<C extends VContext, O extends SourceOptions<C>> = BasicSource<C, O> | AsyncIterableLike<BasicSource<C, O>>;

export interface SourceReferenceDetail<Async extends boolean = boolean, Reference extends SourceReferenceRepresentation = SourceReferenceRepresentation> {
  async: Async;
  reference: Reference;
}

export interface AsyncSourceReferenceDetail extends SourceReferenceDetail<true, AsyncSourceReferenceRepresentation> {

}

export interface SyncSourceReferenceDetail extends SourceReferenceDetail<false, SyncSourceReferenceRepresentation> {

}

export function isAsyncSourceReferenceDetail(source: unknown): source is AsyncSourceReferenceDetail {
  function isAsyncSourceReferenceDetailLike(value: unknown): value is { async?: unknown, reference?: unknown } {
    return typeof value === "object";
  }
  return (
    isAsyncSourceReferenceDetailLike(source) &&
    source.async === true &&
    isAsyncSourceReferenceRepresentation(source.reference)
  );
}

export function isSyncSourceReferenceDetail(source: unknown): source is SyncSourceReferenceDetail {
  function isSyncSourceReferenceDetailLike(value: unknown): value is { async?: unknown, reference?: unknown } {
    return typeof value === "object";
  }
  return (
    isSyncSourceReferenceDetailLike(source) &&
    source.async === false &&
    isSyncSourceReferenceRepresentation(source.reference)
  );
}

export function isSourceReferenceDetail(value: unknown): value is SourceReferenceDetail {
  return (
    isAsyncSourceReferenceDetail(value) ||
    isSyncSourceReferenceDetail(value)
  );
}

export function isIterableIterator(value: unknown): value is (IterableIterator<any> | AsyncIterableIterator<any>)  {
  function isIteratorLike(value: unknown): value is { next?: unknown } {
    return typeof value === "object";
  }
  return (
    isIteratorLike(value) &&
    value.next instanceof Function &&
    (
      isAsyncIterable(value) ||
      isIterable(value)
    )
  );
}

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  function isPromiseLike(value: unknown): value is { then?: unknown } {
    return typeof value === "object";
  }
  return (
    isPromiseLike(value) &&
    value.then instanceof Function
  );
}

export function isAsyncSourceReferenceRepresentation(value: unknown): value is AsyncSourceReferenceRepresentation {
  return (
    isVNode(value) ||
    isAsyncIterable(value) ||
    isPromise(value) ||
    isIterableIterator(value)
  );
}

export function isSourceReference(value: unknown): value is SourceReference {
  return (
    typeof value === "symbol" ||
    typeof value === "string" ||
    typeof value === "number"
  );
}

export function isSyncSourceReferenceRepresentation(value: unknown): value is SyncSourceReferenceRepresentation {
  return (
    isIterable(value) ||
    isSourceReference(value)
  );
}

export function getSourceReferenceDetail<C extends VContext, O extends ContextSourceOptions<C>>(context: C, source: Source<C, unknown>, options: O): SourceReferenceDetail {
  if (source instanceof Function) {
    const reference = source({
      ...options
    });
    const detail = getSourceReferenceDetail(context, reference, options);
    context.weak.set(source, detail);
    return detail;
  }
  if (isSourceReference(source)) {
    return {
      async: false,
      reference: source
    };
  }
  const detail = {
    async: isAsyncSourceReferenceRepresentation(source),
    reference: source
  };
  if (!isSourceReferenceDetail(detail)) {
    return undefined;
  }
  return detail;
}
