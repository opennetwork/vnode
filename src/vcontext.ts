import { SourceReference } from "./source";
import { VNode, isVNode } from "./vnode";

export interface VContext {

  weak: WeakMap<object, unknown>;

  get(reference: SourceReference): Promise<VNode>;
  set(reference: SourceReference, node: VNode): Promise<void>;
  remove(reference: SourceReference): Promise<void>;
  clear(): Promise<void>;

}

interface WeakContextMap extends WeakMap<object, Map<SourceReference, VNode>> {

}

const globalWeak: WeakContextMap = new WeakMap<object, Map<SourceReference, VNode>>();

/**
 * @param {WeakMap} weak
 * @param {object} reference
 * @returns {Map}
 */
function getDOMContext(weak: WeakContextMap, reference: object) {
  const result = weak.get(reference);
  if (result) {
    return result;
  }
  const map = new Map();
  weak.set(reference, map);
  return map;
}

const DOMContextReference = Symbol();

export class WeakVContext implements VContext {

  private readonly [DOMContextReference]: object = {};
  public readonly weak: WeakMap<object, any>;

  constructor(weak?: WeakMap<object, any>) {
    this.weak = weak || globalWeak;
  }

  async set(reference: SourceReference, node: VNode) {
    const context = getDOMContext(this.weak, this[DOMContextReference]);
    context.set(reference, node);
  }

  async remove(reference: SourceReference) {
    const context = getDOMContext(this.weak, this[DOMContextReference]);
    context.delete(reference);
  }

  async get(reference: SourceReference) {
    const context = getDOMContext(this.weak, this[DOMContextReference]);
    const result = context.get(reference);
    return isVNode(result) ? result : undefined;
  }

  async clear() {
    const context = getDOMContext(this.weak, this[DOMContextReference]);
    context.clear();
  }
}
