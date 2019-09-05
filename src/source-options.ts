import { VContextLike } from "./vcontext";

export interface SourceOptions<C extends VContextLike> {
  context?: C;
}

export interface HydratedSourceOptions<C extends VContextLike> extends SourceOptions<C> {
  readonly context: C;
}
