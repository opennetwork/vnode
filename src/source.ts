import { AsyncIterableLike } from "iterable";
import { SourceOptions, ContextSourceOptions } from "./source-options";
import { VContext } from "./vcontext";
import { VNodeRepresentation } from "./vnode";

export type SourceReference = string | symbol | number;
export type AsyncSourceReferenceRepresentation = VNodeRepresentation | Promise<SourceReference> | AsyncIterable<SourceReference>;
export type SyncSourceReferenceRepresentation = SourceReference | Iterable<SourceReference>;
export type SourceReferenceRepresentation = AsyncSourceReferenceRepresentation | SyncSourceReferenceRepresentation;
export type SourceReferenceFactory<C extends VContext, O extends SourceOptions<C>> = (options: O & ContextSourceOptions<C>) => SourceReferenceRepresentation;
export type SourceReferenceLike<C extends VContext, O extends SourceOptions<C>> = SourceReferenceRepresentation | SourceReferenceFactory<C, O>;
export type BasicSource<C extends VContext, O extends SourceOptions<C>> = SourceReferenceLike<C, O> | AsyncIterableLike<SourceReferenceLike<C, O>>;
export type Source<C extends VContext, O extends SourceOptions<C>> = BasicSource<C, O> | AsyncIterableLike<BasicSource<C, O>>;

export function isSourceReference(value: unknown): value is SourceReference {
  return (
    typeof value === "symbol" ||
    typeof value === "string" ||
    typeof value === "number"
  );
}
