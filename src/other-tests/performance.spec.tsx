import { WeakVContext } from "../vcontext-weak";
import { VContextHydrateEvent } from "../vcontext-events";
import { hydrate, hydrateChildren } from "../hydrate";
import { Component } from "typedoc/dist/lib/utils";
import { h } from "../h";
import { createNode } from "../create-node";
import { performance, PerformanceObserver } from "perf_hooks";

class HydratingVContext extends WeakVContext {
  async hydrate(node: VContextHydrateEvent["node"], tree?: VContextHydrateEvent["tree"]): Promise<void> {
    await hydrateChildren(this, node, tree);
  }
}

describe("Performance", function () {

  const obs = new PerformanceObserver((items) => {
    for (const { duration, name } of items.getEntries()) {
      const length = +name.split(":")[1];
      console.log({ length, duration, individual: duration / length });
    }
    performance.clearMarks();
  });
  obs.observe({
    entryTypes: [
      "measure"
    ]
  });

  it.concurrent.each([
      [100],
      [1000],
      [2000],
      [10000]
  ])("%p", async (length) => {
    const context = new HydratingVContext();
    async function *Other() {
      await new Promise(resolve => setTimeout(resolve, 0));
      yield 1;
    }
    function Component() {
      return Array.from({ length }, () => createNode(Other));
    }
    performance.mark("start");
    await hydrate(context, <Component />);
    performance.mark("end");
    performance.measure(`Start to End:${length}`, "start", "end");
  });

});
