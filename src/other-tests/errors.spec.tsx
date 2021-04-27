import { hydrate, hydrateChildren } from "../hydrate";
import { Component } from "typedoc/dist/lib/utils";
import { h } from "../h";
import { VNode } from "../vnode";
import { VContext } from "../vcontext";
import { WeakVContext } from "../vcontext-weak";
import { Tree } from "../tree";
import { Catch } from "../catch";

// import { render } from "@opennetwork/vdom";

async function render(node: VNode, unused: Element) {
    class Context extends WeakVContext {


        constructor(private options: { parent?: Context, node?: VNode }) {
            super();
        }

        async hydrate(node: VNode, tree?: Tree) {
            const childContext = new Context({
                parent: this,
                node
            });
            await hydrateChildren(childContext, node, tree);
        }

        async catch(error: unknown, node: VNode, tree?: Tree) {
            const { parent } = this.options;
            if (isCatchable(Catch, this.options.node)) {
                try {
                    console.log("node catch");
                    await this.options.node[Catch](error, node, tree);
                } catch (childError) {
                    await onParentError(childError);
                }
            } else if (isCatchable(Catch, this)) {
                try {
                    console.log("context catch");
                    await this[Catch](error, node, tree);
                } catch (childError) {
                    await onParentError(childError);
                }
            } else {
                await onParentError(error);
            }

            async function onParentError(error: unknown) {
                if (isCatchable("catch", parent)) {
                    console.log("parent catch");
                    await parent.catch(error, node, tree);
                } else {
                    console.log("throw");
                    throw error;
                }
            }

            function isCatchable<K extends (symbol | string)>(key: K, value: unknown): value is Record<K, Context["catch"]> {
                function isCatchableLike(value: unknown): value is Record<K, unknown> {
                    return !!value;
                }
                return isCatchableLike(value) && typeof value[key] === "function";
            }
        }
    }

    const context = new Context({
        node
    });
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

    it.only("throws an error from a generator", async () => {
        const root = document.createElement("div");
        const errorMessage = `Expected Error: ${Math.random()}`;
        const onError = jest.fn();
        function Throw() {
            throw new Error(errorMessage);
        }
        function *Component() {
            try {
                yield <Throw />;
            } catch (error) {
                onError(error);
                expect(error.message).toEqual(errorMessage);
                yield undefined;
            }
            console.log("next");
        }
        await expect(render(<Component />, root)).resolves.toBeFalsy();
        console.log("Completed");
        expect(onError).toBeCalled();
    });

});
