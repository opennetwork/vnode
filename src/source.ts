import { AsyncIterableLike } from "iterable";
import { VNode, VNodeRepresentationSource } from "./vnode";

/**
 * A scalar source reference, this could be either referencing a {@link NativeVNode} or referencing direct source
 */
export type SourceReference = string | symbol | number | boolean;
/**
 * A {@link SourceReference} that requires asynchronous resolution
 */
export type AsyncSourceReferenceRepresentation<O extends object> = VNodeRepresentationSource | Promise<SourceReference> | AsyncIterable<SourceReference>;
/**
 * A {@link SourceReference} that can be resolved synchronously
 */
export type SyncSourceReferenceRepresentation = SourceReference | Iterable<SourceReference>;
/**
 * A {@link SourceReference} with requiring _either_ synchronous or asynchronous resolution
 */
export type SourceReferenceRepresentation<O extends object> = AsyncSourceReferenceRepresentation<O> | SyncSourceReferenceRepresentation;
/**
 * A function that resolves to a {@link SourceReferenceRepresentation} which can be further processed to obtain a group of {@link SourceReference} values
 */
export type SourceReferenceRepresentationFactory<O extends object> = (options: O, children: AsyncIterable<AsyncIterable<VNode>>) => SourceReferenceRepresentation<O>;
/**
 * A value that represents a {@link SourceReference}
 */
export type SourceReferenceRepresentationLike<O extends object> = SourceReferenceRepresentation<O> | SourceReferenceRepresentationFactory<O>;
/**
 * A value that represents a {@link SourceReference}
 */
export type BasicSourceRepresentation<O extends object> = SourceReferenceRepresentationLike<O> | AsyncIterableLike<SourceReferenceRepresentationLike<O>>;
/**
 * A value that represents a {@link SourceReference}
 */
export type Source<O extends object> = BasicSourceRepresentation<O> | AsyncIterableLike<BasicSourceRepresentation<O>>;

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
