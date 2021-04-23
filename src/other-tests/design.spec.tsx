import { h } from "../h";
import { createFragment, Fragment } from "../fragment";
import { isVNode, VNode } from "../vnode";
import { isSourceReference, SourceReference } from "../source-reference";
import { filtered } from "../filter";

const Token = Symbol("Token");

export interface Token<T extends SourceReference> extends VNode {
    (...args: unknown[]): Token<T>;
    source: T;
    [Token]: true;
    children: never;
}

function createToken<T extends SourceReference>(input: T): Token<T> {
    // Type yoga
    let tokenized: Token<T>;
    function token(): Token<T> {
        return tokenized;
    }
    Object.assign(token, {
        [Token]: true,
        reference: Token,
        source: input
    });
    const almost: unknown = token;
    assertToken(almost, (value: unknown): value is T => value === input);
    tokenized = almost;
    return almost;
}

function isToken<T extends SourceReference = SourceReference>(value: unknown, isTokenSource?: (value: unknown) => value is T): value is Token<T> {
    return typeof value === "function" && isVNode(value) && (isTokenSource ?? isSourceReference)(value.source);
}

function assertToken<T extends SourceReference = SourceReference>(value: unknown, isTokenSource?: (value: unknown) => value is T): asserts value is Token<T> {
    if (!isToken(value, isTokenSource)) {
        throw new Error("Expected token");
    }
}


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
