import { WeakVContext, withContext, hydrate, hydrateChildren } from "../dist/index.js";
import { asyncExtendedIterable, source } from "iterable";
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

  async hydrate(node, tree) {
    this.eventsTarget.hydrate.push({
      node,
      tree
    });
    if (this.weak.has(node)) {
      return;
    }
    this.weak.set(node, true);
    if (node.native && node.source && node.options) {
      return node.source.hydrate(node, node.options);
    }
    await hydrateChildren(this, node, tree);
  }

}

const currentContext = new DOMContext();
const h = withContext(currentContext);
const html = htm.bind(h);

const promise = asyncExtendedIterable(currentContext.eventsTarget.hydrate)
  .forEach(hydrate => {
    console.log({ hydrate });
  });

const node = h(
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
        Third
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
    yield h(
      async function *(options, children) {
        yield "node result 1";
        yield "node result 2";

        const nextSource = source();

        let count = 0;
        let interval = setInterval(() => {
          count += 1;
          nextSource.push(`next interval ${count}`);
          if (count > 2) {
            nextSource.close();
          }
        }, 1000);

        yield* nextSource;

        clearInterval(interval);
        console.log("Returning children", children);
        yield children;
      },
      undefined,
      h(
        async function *() {
          yield "node result 4";
          yield "node result 5";

          const nextSource = source();

          let count = 0;
          let interval = setInterval(() => {
            count += 1;
            nextSource.push(`next interval 2 ${count}`);
            if (count > 2) {
              nextSource.close();
            }
          }, 1000);

          yield* nextSource;

          clearInterval(interval);
        }
      ),
      h(
        async function *() {
          yield "node result 6";
          yield "node result 7";

          const nextSource = source();

          let count = 0;
          let interval = setInterval(() => {
            count += 1;
            nextSource.push(`next interval 3 ${count}`);
            if (count > 2) {
              nextSource.close();
            }
          }, 1000);

          yield* nextSource;

          clearInterval(interval);
        }
      )
    );
    console.log("I'm done");
  },
  {

  }
);

hydrate(currentContext, node)
  .then(() => {
    console.log("Completed hydrating");
    return currentContext.close();
  })
  .then(() => promise)
  .then(() => {
    console.log("Completed listening");
  })
  .catch(error => console.error({ error }));
