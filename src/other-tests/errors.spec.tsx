import { hydrate, hydrateChildren } from "../hydrate";
import { Component } from "typedoc/dist/lib/utils";
import { h } from "../h";
import { VNode } from "../vnode";
import { VContext } from "../vcontext";
// import { render } from "@opennetwork/vdom";

async function render(node: VNode, unused: Element) {
    const context: VContext = {
        async hydrate(node, tree) {
            await hydrateChildren(context, node, tree);
        }
    };
    await hydrate(context, node);
}

describe("Errors", function () {

    it("throws an error", async () => {
        const root = document.createElement("div");
        const errorMessage = `Expected Error: ${Math.random()}`;
        function Component() {
            throw new Error(errorMessage);
        }
        await expect(render(<Component />, root)).rejects.toThrow(errorMessage);
    });

    it("throws an error from a generator", async () => {
        const root = document.createElement("div");
        const errorMessage = `Expected Error: ${Math.random()}`;
        function Throw() {
            throw new Error(errorMessage);
        }
        function *Component() {
            try {
                debugger;
                yield <Throw />;
            } catch (error) {
                yield undefined;
            }
        }
        await expect(render(<Component />, root)).resolves.toBeFalsy();
    });

});
