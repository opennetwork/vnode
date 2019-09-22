import { MarshalledVNode, VNode } from "./vnode";
import { isSourceReference, MarshalledSourceReference, SourceReference } from "./source";
import { asyncExtendedIterable } from "iterable";

/**
 * Marshals a VNode into a synchronous state allowing for transmission or storage
 *
 * This involves three parts:
 *
 * - Any scalar with no children or options will be represented directly as a `number`, `string`, or `boolean`
 * - All references will be turned into a `number`, or if a `getReference` `function` is passed, a `number`, `string`, or `boolean`
 * - All children will be represented as an array of arrays, where the values have also passed through the marshal process
 *
 * This process only changes the representation of {@link VNode.reference} and {@link VNode.children}, this means that if
 * something like a `Symbol` is used then it will be lost when the value is finally serialised, these cases must be handled
 * by the consumer of this function
 *
 * @param node
 * @param parent
 * @param getReference
 */
export async function marshal(node: VNode, parent?: SourceReference, getReference?: (parent: SourceReference, reference: SourceReference) => MarshalledSourceReference): Promise<MarshalledVNode | MarshalledSourceReference> {
  /**
   * We will use this as a reference counter when we don't have a getReference function
   *
   * Each VNode will be assigned the next value after incrementing
   */
  let currentReference = 0;
  /**
   * Where the key is the parent source reference, and the value is a map of all marshalled references in relation to the reference
   */
  const referenceMap = new Map<SourceReference, Map<SourceReference, MarshalledSourceReference>>();

  /**
   * If no parent is passed this will be a process unique reference, meaning we can use it to start off our reference generation
   */
  const rootParent = Symbol("Root");

  /**
   * This will be our marshalled reference for the current node, this will be passed down to children to have a context
   * reference for further reference generation
   */
  const reference = getReferenceInternal(parent, node.reference);

  const children = await asyncExtendedIterable(node.children || []).map(
    children => asyncExtendedIterable(children || []).map(
      child => marshal(child, reference, getReferenceInternal)
    ).toArray()
  ).toArray();

  if (
    node.scalar &&
    /**
     * All children lists must have no values, which would mean this VNode never will represent a VNode with children
     */
    (
      children.length === 0 ||
      children.every(children => children.length === 0)
    ) &&
    /**
     * A ScalarVNode can have options like any other VNode, if it does we need the full representation
     */
    (
      !node.options ||
      Object.keys(node.options).length === 0
    ) &&
    isSourceReference(node.source) &&
    /**
     * If its a symbol, its a no go, it will be serialised as null, giving us no information
     */
    typeof node.source !== "symbol"
  ) {
    return node.source;
  }

  return {
    ...node,
    reference,
    children
  };

  /**
   * This is a template for `getReference`, something similar would be expected of an implementor of said function,
   * we want a unique reference across each child, children across {@link VNode} values can have the same reference
   *
   * @param parent
   * @param sourceReference
   */
  function getReferenceInternal(parent: SourceReference | undefined, sourceReference: SourceReference): MarshalledSourceReference {
    if (getReference) {
      return getReference(parent || rootParent, sourceReference);
    }
    let map = referenceMap.get(parent || rootParent);
    if (!map) {
      map = new Map();
      referenceMap.set(parent || rootParent, map);
    }
    const current = map.get(sourceReference);
    if (typeof current === "number") {
      return current;
    }
    const next = currentReference += 1;
    map.set(sourceReference, currentReference);
    return next;
  }
}
