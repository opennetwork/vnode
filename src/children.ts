import { VContext, assertNonNative } from "./vcontext";
import { ContextSourceOptions } from "./source-options";
import { isVNode, VNode, VNodeRepresentation, getScalar, isScalarVNode } from "./vnode";
import {
  getSourceReferenceDetail,
  isPromise,
  isSourceReference,
  isSourceReferenceDetail,
  SourceReferenceRepresentation
} from "./source";
import { isAsyncIterable, isIterable } from "iterable";

export async function *generateChildren<C extends VContext, HO extends ContextSourceOptions<C>>(context: VContext, options: HO, children: Iterable<VNodeRepresentation> | SourceReferenceRepresentation | VNodeRepresentation): AsyncIterable<VNode["reference"]> {
  for await (const node of generateChildrenVNodes(context, options, children)) {
    if (isScalarVNode(node)) {
      yield node.value;
    } else {
      yield isVNode(node) ? node.reference : undefined;
    }
  }
}

export async function *generateChildrenVNodes<C extends VContext,  HO extends ContextSourceOptions<C>>(context: VContext, options: HO, children: Iterable<VNodeRepresentation> | SourceReferenceRepresentation | VNodeRepresentation): AsyncIterable<VNode> {
  const detail = getSourceReferenceDetail(context, children, options);
  if (!isSourceReferenceDetail(detail)) {
    return yield undefined;
  }
  let reference = detail.reference;
  if (isPromise(reference)) {
    reference = await reference;
  }
  if (isVNode(reference)) {
    await assertNonNative(context, reference.reference);
    return yield reference;
  }
  if (isAsyncIterable(reference)) {
    for await (const value of reference) {
      if (isSourceReference(value)) {
        await assertNonNative(context, value);
        yield (await context.get(value) || await getScalar(options, value));
      } else {
        yield* generateChildrenVNodes(context, options, value);
      }
    }
  } else if (isIterable(reference)) {
    for (const value of reference) {
      if (isSourceReference(value)) {
        await assertNonNative(context, value);
        yield (await context.get(value) || await getScalar(options, value));
      } else {
        yield* generateChildrenVNodes(context, options, value);
      }
    }
  } else {
    await assertNonNative(context, reference);
    yield (await context.get(reference) || await getScalar(options, reference));
  }
}
