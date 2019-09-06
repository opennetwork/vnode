import { SourceReference } from "./source";
import { VNode, isVNode, ScalarVNode, isHydratedVNode, NativeVNode } from "./vnode";
import { HydratedSourceOptions } from "./source-options";

export interface VContext {

  weak: WeakMap<object, unknown>;
  isNative?: (reference: SourceReference) => Promise<boolean>;
  getNative?: (reference: SourceReference) => Promise<NativeVNode | undefined>;

  get(reference: SourceReference): Promise<VNode>;
  set(reference: SourceReference, node: VNode): Promise<void>;
  remove(reference: SourceReference): Promise<void>;
  hydrate<C extends VContext, O extends HydratedSourceOptions<C>>(reference: SourceReference, node: VNode, context: C, options: O): Promise<VNode>;
  clear(): Promise<void>;

}

interface WeakContextMap extends WeakMap<object, Map<SourceReference, VNode>> {

}

const globalWeak: WeakContextMap = new WeakMap<object, Map<SourceReference, VNode>>();

export function isNativeVContext(context: VContext): context is VContext & { getNative: Function, isNative: Function } {
  return context && context.getNative instanceof Function && context.isNative instanceof Function;
}

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

  async get(reference: SourceReference): Promise<VNode | ScalarVNode> {
    const context = getDOMContext(this.weak, this[DOMContextReference]);
    console.log(context);
    const result = context.get(reference);
    if (isVNode(result)) {
      return result;
    }
    if (isNativeVContext(this)) {
      if (await this.isNative(reference)) {
        throw new Error("Native element referenced in VContext.get");
      }
    }
    return undefined;
  }

  private isThisContext(value: unknown): value is this {
    return value === this;
  }

  async hydrate<C extends VContext, O extends HydratedSourceOptions<C>>(reference: SourceReference, node: VNode, context: C, options: O) {
    if (isHydratedVNode(node)) {
      return node; // Ready to roll
    }
    if (!this.isThisContext(context)) {
      return {
        ...context.hydrate(reference, node, context, options),
        hydrated: true
      };
    }
    await this.set(reference, node);
    // Nothing to do, an abstract function allowing for extension
    return {
      ...node,
      hydrated: true
    };
  }

  async clear() {
    const context = getDOMContext(this.weak, this[DOMContextReference]);
    context.clear();
  }
}
