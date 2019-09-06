import { SourceReference } from "./source";
import { VNode, isVNode, ScalarVNode, isHydratedVNode, NativeVNode } from "./vnode";
import { HydratedSourceOptions } from "./source-options";

export interface VContext {

  weak: WeakMap<object, unknown>;
  isNative?: (reference: SourceReference) => Promise<boolean>;
  getNative?: (reference: SourceReference) => Promise<NativeVNode | undefined>;

  isolate(reference: SourceReference): Promise<VContext>;

  get(reference: SourceReference): Promise<VNode>;
  set(reference: SourceReference, node: VNode): Promise<void>;
  remove(reference: SourceReference): Promise<void>;
  hydrate<C extends VContext, O extends HydratedSourceOptions<C>>(reference: SourceReference, node: VNode, context: C, options: O): Promise<VNode>;
  clear(): Promise<void>;

}

interface WeakContextReference {
  node?: VNode;
  isolate?: VContext;
}

interface WeakContextMap extends WeakMap<object, Map<SourceReference, WeakContextReference>> {

}

const globalWeak: WeakContextMap = new WeakMap<object, Map<SourceReference, WeakContextReference>>();

export function isNativeVContext(context: VContext): context is VContext & { getNative: Function, isNative: Function } {
  return context && context.getNative instanceof Function && context.isNative instanceof Function;
}

/**
 * @param {WeakMap} weak
 * @param {object} reference
 * @returns {Map}
 */
function getWeakContext(weak: WeakContextMap, reference: object) {
  const result = weak.get(reference);
  if (result) {
    return result;
  }
  const map = new Map();
  weak.set(reference, map);
  return map;
}

const WeakVContextReference = Symbol();

export class WeakVContext implements VContext {

  private [WeakVContextReference]: object = {};
  public readonly weak: WeakMap<object, any>;

  constructor(weak?: WeakMap<object, any>) {
    this.weak = weak || globalWeak;
  }

  private async getWeakReference(reference: SourceReference): Promise<WeakContextReference> {
    const context = getWeakContext(this.weak, this[WeakVContextReference]);
    return context.get(reference) || {};
  }

  private async putWeakReference(reference: SourceReference, details: Partial<WeakContextReference>) {
    const context = getWeakContext(this.weak, this[WeakVContextReference]);
    context.set(reference, {
      ...await this.getWeakReference(reference),
      ...details
    });
  }

  async isolate(reference: SourceReference, getIsolate?: () => VContext) {
    const details = await this.getWeakReference(reference);
    if (details.isolate) {
      return details.isolate;
    }
    const isolate = getIsolate ? getIsolate() : new WeakVContext(new WeakMap<object, any>());
    await this.putWeakReference(reference, {
      isolate
    });
    return isolate;
  }

  async set(reference: SourceReference, node: VNode) {
    await this.putWeakReference(reference, {
      node
    });
  }

  async remove(reference: SourceReference) {
    await this.putWeakReference(reference, {
      node: undefined
    });
  }

  async get(reference: SourceReference): Promise<VNode | ScalarVNode> {
    const details = await this.getWeakReference(reference);
    if (isVNode(details.node)) {
      return details.node;
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
    this[WeakVContextReference] = {};
  }
}
