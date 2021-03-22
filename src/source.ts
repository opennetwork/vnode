import { AsyncIterableLike } from "iterable";
import { VNode, VNodeRepresentationSource } from "./vnode";
import { SourceReference } from "./source-reference";

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
export type SourceReferenceRepresentationFactory<O extends object> = (options: O, children: VNode) => SourceReferenceRepresentation<O>;
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
