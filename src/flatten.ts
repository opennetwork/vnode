import { VContext } from "./vcontext";
import { ContextSourceOptions } from "./source-options";
import { isSourceReference, SourceReference } from "./source";
import { isVNode, VNode } from "./vnode";
import { Fragment } from "./fragment";
import { assertNonNative } from "./vcontext";

export async function *flatten<C extends VContext, HO extends ContextSourceOptions<C>>(context: C, node: unknown, options: HO): AsyncIterable<SourceReference> {
  if (isSourceReference(node)) {
    await assertNonNative(context, node, "flatten found non reference");
    return yield node;
  }
  if (!isVNode(node)) {
    return;
  }
  if (node.reference !== Fragment) {
    return yield* flatten(context, node.reference, options);
  }
  for await (const reference of node.children) {
    yield* flatten(context, reference, options);
  }
}

export async function *flattenAndGet<C extends VContext, HO extends ContextSourceOptions<C>>(context: C, node: unknown, options: HO): AsyncIterable<VNode> {
  for await (const value of flatten(context, node, options)) {
    if (!isSourceReference(value)) {
      yield undefined;
    } else {
      yield await context.get(value);
    }
  }
}
