import { WeakVContext, withContext, hydrate } from "../dist";
import { asyncExtendedIterable } from "iterable";
import htm from "htm";

class NativeVNode  {

  constructor(reference) {
    this.reference = reference;
    this.native = true;
    this.hydrated = new WeakMap();
  }

  async hydrate(node, options) {
    if (this.hydrated.has(options)) {
      return;
    }
    this.hydrated.set(options, {});
    console.log("NATIVE HYDRATE", this.reference, node.reference, options);
  }

}

const native = {
  button: new NativeVNode("button")
};

class DOMContext extends WeakVContext {

  async isolate(reference) {
    return super.isolate(reference, () => new DOMContext());
  }

  async isNative(reference) {
    return !!native[reference];
  }

  async getNative(reference) {
    if (!native[reference]) {
      return undefined;
    }
    return {
      source: native[reference],
      native: true,
      reference: Symbol("Native Instance")
    };
  }

  async hydrate(node) {
    if (node.native && node.source && node.options) {
      return node.source.hydrate(node, node.options);
    }
  }

}

const currentContext = new DOMContext();
const h = withContext(currentContext);
const html = htm.bind(h);

const nodes = h(
  async function *() {
    console.log("Start");
    yield html`
      <button onClick=${() => console.log("Clicked")} reference="first">
        First
      </button>
      <button onClick=${() => console.log("Clicked")} reference="second">
        Second
      </button>
      <button onClick=${() => console.log("Clicked")} reference="third">
        Second
      </button>
    `;
    console.log("Next will be an array");
    yield [
      "A",
      "B",
      "C"
    ];
    console.log("Next will be a function");
    yield () => "fn";
    console.log("Next will be an async function");
    yield async () => "async fn";
    console.log("Next will be a node itself");
    yield* h(
      async function *() {
        yield "node result 1";
        yield "node result 2";
      },
      {}
    );
    console.log("I'm done");
  },
  {

  }
);

const nodesIterator = nodes[Symbol.asyncIterator]();

asyncExtendedIterable(nodesIterator)
  .forEach(async value => {
    console.log(value);
    await hydrate(currentContext, value);
  })
  .then(() => console.log("Complete"))
  .catch(error => console.error({ error }));
