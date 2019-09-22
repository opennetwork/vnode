import { MarshalledVNode, VNode } from "./vnode";
import { isSourceReference, MarshalledSourceReference, SourceReference } from "./source";
import { asyncExtendedIterable } from "iterable";

export async function marshal(node: VNode, parent?: SourceReference, getReference?: (parent: SourceReference | undefined, reference: SourceReference) => MarshalledSourceReference): Promise<MarshalledVNode | MarshalledSourceReference> {


  let currentReference = 0;
  const referenceMap = new Map<SourceReference, Map<SourceReference, MarshalledSourceReference>>();
  const rootParent = Symbol("Root");

  const reference = getReferenceInternal(parent, node.reference);

  const children = await asyncExtendedIterable(node.children || []).map(
    children => asyncExtendedIterable(children || []).map(
      child => marshal(child, reference, getReferenceInternal)
    ).toArray()
  ).toArray();

  if (
    node.scalar &&
    // Children length must be zero
    (children.length === 0 || (children.length === 1 && children[0].length === 0)) &&
    // We must have no options, or no keys
    (
      !node.options ||
      Object.keys(node.options).length === 0
    ) &&
    isSourceReference(node.source) &&
    typeof node.source !== "symbol"
  ) {
    return node.source;
  }

  return {
    ...node,
    reference,
    children
  };

  function getReferenceInternal(parent: SourceReference | undefined, sourceReference: SourceReference): MarshalledSourceReference {
    if (getReference) {
      return getReference(parent, sourceReference);
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
