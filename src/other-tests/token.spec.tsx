import { h } from "../h";
import { VNode } from "../vnode";
import { isSourceReference, SourceReference } from "../source-reference";
import { filtered } from "../filter";
import { createToken, isTokenVNode } from "../token";
import { createFragment } from "../fragment";

describe("Tokens", () => {

    it("works", async () => {

        const FirstNameInput = createToken(Symbol("FirstNameInput"));
        const LastNameInput = createToken(Symbol("LastNameInput"));

        function PersonIdentification() {
            return (
                <>
                    <FirstNameInput />
                    <LastNameInput />
                </>
            );
        }

        const symbols = filtered(<PersonIdentification />, isTokenVNode);

        let results;
        for await (const children of symbols.children) {
            results = children.map(node => node.source);
        }
        expect(results).toBeTruthy();
        expect(results.length).toEqual(2);
        const [firstName, lastName] = results;
        expect(firstName).toEqual(FirstNameInput.source);
        expect(lastName).toEqual(LastNameInput.source);
    });

});

type SourceVNode = VNode & { source: SourceReference };
function sources(node: VNode): VNode & { children: AsyncIterable<SourceVNode[]> } {
    return filtered(node, isSourceVNode);

    function isSourceVNode(node: VNode): node is SourceVNode {
        return isSourceReference(node.source) && node.source !== node.reference;
    }
}
