import { SourceReference } from "./source";
import { VNode } from "./vnode";

export interface VContext {

  get: Function;
  set: Function;
  remove: Function;
  clear: Function;

}

export interface SyncVContext extends VContext {

  get(reference: SourceReference): VNode;
  set(reference: SourceReference, node: VNode): void;
  remove(reference: SourceReference): void;
  clear(): void;

}

export interface AsyncVContext extends VContext {

  get(reference: SourceReference): Promise<VNode>;
  set(reference: SourceReference, node: VNode): Promise<void>;
  remove(reference: SourceReference): Promise<void>;
  clear(): Promise<void>;

}

export type VContextLike = SyncVContext | AsyncVContext | VContext;
