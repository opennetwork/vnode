import { isHydratingVContext, VContext } from "./vcontext";
import { isHydratableVNode, isHydratedVNode, isScalarVNode, VNode } from "./vnode";
import { asyncExtendedIterable } from "iterable";

export async function hydrate<C extends VContext>(context: C, node: VNode) {
  if (!isHydratingVContext(context)) {
    return; // Nothing to do, can never hydrate
  }
  if (isScalarVNode(node)) {
    return; // Nothing to do here
  }
  if (isHydratedVNode(node)) {
    return;
  }
  if (isHydratableVNode(context, node)) {
    return context.hydrate(node);
  }
  // This will continue until there are no more generated children for a node
  //
  // This allows values to be hydrated every time there is a new set of children instance
  //
  // At a top level this means that if we still have children being generated, we're still
  // going to be waiting for it to complete
  await asyncExtendedIterable(node.children)
    .forEach(nextChildren => (
      asyncExtendedIterable(nextChildren).forEach(child => hydrate(context, child))
    ));
}
