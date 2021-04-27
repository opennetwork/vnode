import type { VNode } from "./vnode";
import type { Tree } from "./tree";

export const Catch = Symbol.for("@opennetwork/vnode/catch");
export interface CatchFn {
  (error: unknown, node: VNode, tree?: Tree): void | Promise<void>;
}
