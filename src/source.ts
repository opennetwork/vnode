import { AsyncIterableLike } from "iterable";
import { SourceOptions, ContextSourceOptions } from "./source-options";
import { VContext } from "./vcontext";
import { VNodeRepresentationSource } from "./vnode";

/**
 * A scalar source reference, this could be either referencing a {@link NativeVNode} or referencing direct source
 */
export type SourceReference = string | symbol | number | boolean;
/**
 * A {@link SourceReference} that requires asynchronous resolution
 */
export type AsyncSourceReferenceRepresentation<C extends VContext, O extends SourceOptions<C>> = VNodeRepresentationSource<C, O> | Promise<SourceReference> | AsyncIterable<SourceReference>;
/**
 * A {@link SourceReference} that can be resolved synchronously
 */
export type SyncSourceReferenceRepresentation = SourceReference | Iterable<SourceReference>;
/**
 * A {@link SourceReference} with requiring _either_ synchronous or asynchronous resolution
 */
export type SourceReferenceRepresentation<C extends VContext, O extends SourceOptions<C>> = AsyncSourceReferenceRepresentation<C, O> | SyncSourceReferenceRepresentation;
/**
 * A function that resolves to a {@link SourceReferenceRepresentation} which can be further processed to obtain a group of {@link SourceReference} values
 */
export type SourceReferenceRepresentationFactory<C extends VContext, O extends SourceOptions<C>> = (options: O & ContextSourceOptions<C>) => SourceReferenceRepresentation<C, O>;
/**
 * A value that represents a {@link SourceReference}
 */
export type SourceReferenceRepresentationLike<C extends VContext, O extends SourceOptions<C>> = SourceReferenceRepresentation<C, O> | SourceReferenceRepresentationFactory<C, O>;
/**
 * A value that represents a {@link SourceReference}
 */
export type BasicSourceRepresentation<C extends VContext, O extends SourceOptions<C>> = SourceReferenceRepresentationLike<C, O> | AsyncIterableLike<SourceReferenceRepresentationLike<C, O>>;
/**
 * A value that represents a {@link SourceReference}
 */
export type Source<C extends VContext, O extends SourceOptions<C>> = BasicSourceRepresentation<C, O> | AsyncIterableLike<BasicSourceRepresentation<C, O>>;

/**
 * Indicates if a value is a {@link SourceReference}
 * @param value
 */
export function isSourceReference(value: unknown): value is SourceReference {
  return (
    typeof value === "symbol" ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
