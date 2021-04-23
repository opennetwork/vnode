import { h } from "../h";
import { createFragment, Fragment } from "../fragment";
import { isVNode, VNode } from "../vnode";
import { isSourceReference, SourceReference } from "../source-reference";
import { filtered } from "../filter";
import { createToken } from "../token";

describe("Design", () => {

    describe("Design tokens", () => {

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

           const symbols = sources(<PersonIdentification />);

           let results;
           for await (const children of symbols.children) {
               results = children.map(node => node.source);
           }
           expect(results).toBeTruthy();
           console.log(results);
       });

    });

});

type SourceVNode = VNode & { source: SourceReference };
function sources(node: VNode): VNode & { children: AsyncIterable<SourceVNode[]> } {
    return filtered(node, isSourceVNode);

    function isSourceVNode(node: VNode): node is SourceVNode {
        return isSourceReference(node.source) && node.source !== node.reference;
    }
}
