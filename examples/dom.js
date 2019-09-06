import {WeakVContext, createHydrator, isHydratableVNode, isNativeVNode, isHydratedVNode} from "../dist";
import { asyncExtendedIterable } from "iterable";
import htm from "htm";



class NativeVNode  {

  constructor(reference) {
    this.reference = reference;
    this.native = true;
    this.children = asyncExtendedIterable([]);
    this.hydrated = new WeakMap();
  }

  async hydrate(node, options) {
    console.log("NATIVE HYDRATE", this.reference, node.reference, options);
    return this;
  }

}

const native = {
  button: new NativeVNode("button")
};

class DOMContext extends WeakVContext {

  async isNative(reference) {
    return !!native[reference];
  }

  async getNative(reference) {
    if (!await this.isNative(reference)) {
      return undefined;
    }
    return {
      source: native[reference],
      native: true,
      reference: Symbol("Native Instance"),
      children: asyncExtendedIterable([])
    };
  }

  async get(reference) {
    const result = await super.get(reference);
    if (result) {
      return result;
    }
    if (typeof reference !== "string" && typeof reference !== "number") {
      return undefined;
    }
    return {
      reference,
      scalar: true,
      children: asyncExtendedIterable([])
    }
  }

  async hydrate(reference, node, context, options) {
    if (isHydratedVNode(node)) {
      return node;
    }
    if (node instanceof NativeVNode) {
      return node.hydrate(node, options);
    }
    if (isHydratableVNode(context, node) && isNativeVNode(node)) {
      await this.hydrate(reference, node.source, context, options);
      return {
        ...node,
        hydrated: true
      };
    }
    return super.hydrate(reference, node, context, options);
  }

}

const h = createHydrator(new DOMContext());
const html = htm.bind(h);

const nodes = h(
  async function *() {
    // console.log("Start");
    // yield html`
    //   <button onClick=${() => console.log("Clicked")} reference="first">
    //     First
    //   </button>
    //   <button onClick=${() => console.log("Clicked")} reference="second">
    //     Second
    //   </button>
    //   <button onClick=${() => console.log("Clicked")} reference="third">
    //     Second
    //   </button>
    // `;
    // console.log("Next will be an array");
    yield [
      "A",
      "B",
      "C"
    ];
    console.log("Next will be a function");
    yield () => "fn";
    console.log("Next will be an async function");
    yield async () => "async fn";
    // console.log("Next will be a node itself");
    // yield* h(
    //   async function *() {
    //     yield "node result 1";
    //     yield "node result 2";
    //   },
    //   {}
    // );
    // console.log("I'm done");
  },
  {

  }
);

const nodesIterator = nodes[Symbol.asyncIterator]();

asyncExtendedIterable(nodesIterator)
  .forEach(async node => {
    console.log("output", node ? { node, children: await asyncExtendedIterable(node.children).toArray() } : undefined);
  })
  .then(() => console.log("Complete"))
  .catch(console.error);