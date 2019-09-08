import { VContext } from "./vcontext";
import { ContextSourceOptions } from "./source-options";
import { isVNode, ScalarVNode, VNode } from "./vnode";
import { Fragment } from "./fragment";

export async function *flatten<C extends VContext, HO extends ContextSourceOptions<C>>(node: unknown): AsyncIterable<ScalarVNode | VNode | undefined> {
  if (!isVNode(node)) {
    if (node) {
      console.warn("Found non VNode where it wasn't expected", { node });
      throw new Error("Found non VNode where it wasn't expected");
    }
    return;
  }
  if (node.reference !== Fragment) {
    return yield node;
  }
  for await (const child of node.children) {
    yield* flatten(child);
  }
}
