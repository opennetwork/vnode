import { SourceReference } from "./source";

export interface VNode {
  reference: SourceReference;
  children: AsyncIterable<SourceReference>;
}
