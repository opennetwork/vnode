import { h } from "../h";
import { filteredChildren } from "../filter";
import { createToken, isTokenVNode, TokenOptionsRecord, TokenVNodeFn } from "../token";
import { createFragment } from "../fragment";
import { createNode } from "../create-node";

describe("Tokens", () => {

    it("works", async () => {
        const FirstNameInputSymbol = Symbol("FirstNameInput");
        const LastNameInputSymbol = Symbol("LastNameInput");
        type FirstNameInputNode = TokenVNodeFn<typeof FirstNameInputSymbol>;
        type LastNameInputNode = TokenVNodeFn<typeof LastNameInputSymbol>;

        const FirstNameInput: FirstNameInputNode = createToken(FirstNameInputSymbol);
        const LastNameInput: LastNameInputNode = createToken(LastNameInputSymbol);

        function Component() {
            return (
                <>
                    <FirstNameInput />
                    <LastNameInput />
                </>
            );
        }

        const tokens = await last(filteredChildren(<Component />, isTokenVNode));
        expect(tokens).toBeTruthy();
        expect(tokens.length).toEqual(2);
        const [firstName, lastName] = tokens;
        FirstNameInput.assert(firstName);
        LastNameInput.assert(lastName);
    });

    interface InputChildrenOptions {
        option?: number | string;
    }

    const InputChildrenSymbol = Symbol("InputChildren");
    type InputChildrenNode = TokenVNodeFn<typeof InputChildrenSymbol, InputChildrenOptions>;
    const InputChildren: InputChildrenNode = createToken(InputChildrenSymbol);

    interface InputOptions {
        type: string;
    }

    const defaultInputChildOption = Math.random();

    const InputSymbol = Symbol("Input");
    type InputNode = TokenVNodeFn<typeof InputSymbol, InputOptions>;
    const Input: InputNode = createToken(
        InputSymbol,
        {
         type: "text"
        },
        // Default children
        <InputChildren option={defaultInputChildOption} />
    );

    it("allows default options", async () => {
        const defaultType = `${Math.random()}`;
        const Input: InputNode = createToken(InputSymbol, {
            type: defaultType
        });
        const tokens = await last(filteredChildren(<Input />, isTokenVNode));
        expect(tokens).toBeTruthy();
        expect(tokens).toHaveLength(1);
        const [token] = tokens;
        Input.assert(token);
        expect(token.options.type).toEqual(defaultType);
    });

    it("allows options", async () => {
        const expectedType = `${Math.random()}`;
        const tokens = await last(filteredChildren(<Input type={expectedType} />, isTokenVNode));
        expect(tokens).toBeTruthy();
        expect(tokens).toHaveLength(1);
        const [token] = tokens;
        Input.assert(token);
        expect(token.options.type).toEqual(expectedType);
    });

    it("allows default children", async () => {

        const tokens = await last(filteredChildren(<Input />, isTokenVNode));

        expect(tokens).toBeTruthy();
        expect(tokens).toHaveLength(1);

        const [input] = tokens;
        Input.assert(input);

        const inputChildrenTokens = await last(filteredChildren(input, InputChildren.is));
        expect(inputChildrenTokens).toBeTruthy();
        expect(inputChildrenTokens).toHaveLength(1);
        const [childToken] = inputChildrenTokens;
        InputChildren.is(childToken);
        expect(childToken.options.option).toEqual(defaultInputChildOption);

    });

    it("allows given children", async () => {

        const expected = Math.random();

        const tokens = await last(
            filteredChildren((
                <Input>
                    <InputChildren option={expected} />
                </Input>
            ), isTokenVNode)
        );

        expect(tokens).toBeTruthy();
        expect(tokens).toHaveLength(1);

        const [input] = tokens;
        Input.assert(input);

        const inputChildrenTokens = await last(filteredChildren(input, InputChildren.is));
        expect(inputChildrenTokens).toBeTruthy();
        expect(inputChildrenTokens).toHaveLength(1);
        const [childToken] = inputChildrenTokens;
        InputChildren.is(childToken);
        expect(childToken.options.option).toEqual(expected);

    });

    it("allows multiple children", async () => {

        const inputChild1Option = Math.random();
        const inputChild2Option = Math.random();
        expect(inputChild1Option).not.toEqual(inputChild2Option);

        const tokens = await last(
            filteredChildren((
                <Input>
                    <InputChildren option={inputChild1Option} />
                    <InputChildren option={inputChild2Option} />
                </Input>
            ), isTokenVNode)
        );

        expect(tokens).toBeTruthy();
        expect(tokens).toHaveLength(1);

        const [input] = tokens;
        Input.assert(input);

        const inputChildrenTokens = await last(filteredChildren(input, InputChildren.is));
        expect(inputChildrenTokens).toBeTruthy();
        expect(inputChildrenTokens).toHaveLength(2);
        const [childToken1, childToken2] = inputChildrenTokens;
        InputChildren.is(childToken1);
        InputChildren.is(childToken2);
        expect(childToken1.options.option).toEqual(inputChild1Option);
        expect(childToken2.options.option).toEqual(inputChild2Option);

    });

});

async function last<T>(iterable: AsyncIterable<T>): Promise<T | undefined> {
    let last: T | undefined = undefined;
    for await (const next of iterable) {
        last = next;
    }
    return last;
}
