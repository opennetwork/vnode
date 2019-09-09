import { VContext } from "./vcontext";

export class WeakVContext implements VContext {

  public readonly weak: WeakMap<object, unknown>;

  constructor(weak?: WeakMap<object, unknown>) {
    this.weak = weak || new WeakMap<object, unknown>();
  }

}
