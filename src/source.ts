import { AsyncIterableLike, isAsyncIterable, isIterable } from "iterable";
import { SourceOptions, HydratedSourceOptions } from "./source-options";
import { VContextLike } from "./vcontext";

export type SourceReference = string | symbol | number;
export type AsyncSourceReferenceRepresentation = Promise<SourceReference> | AsyncIterable<SourceReference>;
export type SyncSourceReferenceRepresentation = SourceReference | Iterable<SourceReference>;
export type SourceReferenceRepresentation = AsyncSourceReferenceRepresentation | SyncSourceReferenceRepresentation;
export type SourceReferenceFactory<C extends VContextLike, O extends SourceOptions<C>> = (options: O & HydratedSourceOptions<C>) => SourceReferenceRepresentation;
export type SourceReferenceLike<C extends VContextLike, O extends SourceOptions<C>> = SourceReferenceRepresentation | SourceReferenceFactory<C, O>;
export type BasicSource<C extends VContextLike, O extends SourceOptions<C>> = SourceReferenceLike<C, O> | AsyncIterableLike<SourceReferenceLike<C, O>>;
export type Source<C extends VContextLike, O extends SourceOptions<C>> = BasicSource<C, O> | AsyncIterableLike<BasicSource<C, O>>;

export interface AsyncSourceDetail {
  async: true;
  reference: AsyncSourceReferenceRepresentation;
}

export interface SyncSourceDetail {
  async: false;
  reference: SyncSourceReferenceRepresentation;
}

export type SourceReferenceDetail = AsyncSourceDetail | SyncSourceDetail;

function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  function isPromiseLike(value: unknown): value is { then?: unknown } {
    return typeof value === "object";
  }
  return (
    isPromiseLike(value) &&
    value.then instanceof Function
  );
}

export function isAsyncSourceReferenceRepresentation(value: Source<any, unknown>): value is AsyncSourceReferenceRepresentation {
  return (
    isAsyncIterable(value) ||
    isPromise(value)
  );
}

export function isSyncSourceReferenceRepresentation(value: Source<any, unknown>): value is SyncSourceReferenceRepresentation {
  return (
    isIterable(value) ||
    typeof value === "symbol" ||
    typeof value === "string" ||
    typeof value === "number"
  );
}

export function getSourceReferenceDetail<C extends VContextLike, O extends HydratedSourceOptions<C>>(context: C, source: Source<C, unknown>, options: O): SourceReferenceDetail {
  if (source instanceof Function) {
    const reference = source({
      ...options
    });
    return getSourceReferenceDetail(context, reference, options);
  }
  if (isAsyncSourceReferenceRepresentation(source)) {
    return {
      async: true,
      reference: source
    };
  }
  if (isSyncSourceReferenceRepresentation(source)) {
    return {
      async: false,
      reference: source
    };
  }
  return undefined;
}
