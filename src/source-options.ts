import { VContext } from "./vcontext";

export interface SourceOptions<C extends VContext> {
  context?: C;
}

export interface HydratedSourceOptions<C extends VContext> extends SourceOptions<C> {
  readonly context: C;
}
