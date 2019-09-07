import { SourceReference } from "./source";
import { NativeVNode } from "./vnode";

export interface VContext {

  weak: WeakMap<object, unknown>;
  isNative?: (reference: SourceReference) => Promise<boolean>;
  getNative?: (reference: SourceReference) => Promise<NativeVNode | undefined>;

}

const globalWeak = new WeakMap<object, unknown>();

export function isNativeVContext(context: VContext): context is VContext & { getNative: Function, isNative: Function } {
  return context && context.getNative instanceof Function && context.isNative instanceof Function;
}

export class WeakVContext implements VContext {

  public readonly weak: WeakMap<object, unknown>;

  constructor(weak?: WeakMap<object, unknown>) {
    this.weak = weak || globalWeak;
  }

}

export async function assertNonNative(context: VContext, reference: SourceReference, message?: string): Promise<void> {
  if (!isNativeVContext(context)) {
    return;
  }
  if (await context.isNative(reference)) {
    throw new Error(message || "Found native reference when not expected");
  }
}
