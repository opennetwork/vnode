import { Source, SourceReferenceRepresentation, getSourceReferenceDetail, SourceReferenceDetail } from "./source";
import { HydratedSourceOptions, SourceOptions } from "./source-options";
import { VContextLike } from "./vcontext";

export function createHydrator<C extends VContextLike>(context: VContextLike) {
  return function h<O extends SourceOptions<C>>(source: Source<C, O>, options: O, children: SourceReferenceRepresentation): SourceReferenceDetail {
    const hydratedOptions: O & HydratedSourceOptions<C> = {
      ...options,
      context
    };
    const reference = getSourceReferenceDetail(context, source, hydratedOptions);
    if (!reference) {
      throw new Error("Unable to retrieve reference representation");
    }
    return reference;
  };
}
