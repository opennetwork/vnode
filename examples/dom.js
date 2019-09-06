import { WeakVContext, createHydrator } from "../dist";
import { asyncExtendedIterable } from "iterable";

function *createContext(currentWeak = undefined) {
  while (true) {
    yield new WeakVContext(currentWeak);
  }
}

const h = createHydrator(createContext());

const nodes = h(
  async function *() {
    console.log("Hello");
    yield "test";
    console.log("Next");
    yield "next test";
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
  {}
);

const nodesIterator = nodes[Symbol.asyncIterator]();

asyncExtendedIterable(nodesIterator)
  .forEach(node => console.log({ node }))
  .then(() => console.log("Complete"))
  .catch(console.error);
