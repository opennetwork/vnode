import { h } from "../h";
import { isVNode, VNode } from "../vnode";
import { isSourceReference, SourceReference } from "../source-reference";
import { filtered } from "../filter";

interface MapMatchProps<M extends VNode = VNode> {
    map?(input: VNode): VNode & { children: AsyncIterable<M[]>};
    match?(node: M): unknown;
}

async function *Every({ map, match }: MapMatchProps, input: VNode) {
    let yielded = false;
    for await (const children of (map ?? sources)(input).children) {
        yield children.every(match ?? isValue);
        yielded = true;
    }
    if (!yielded) return false;

    function isValue(vnode: VNode): unknown {
        return vnode.source;
    }
}

async function *Some({ map, match }: MapMatchProps, input: VNode) {
    let yielded = false;
    for await (const children of (map ?? sources)(input).children) {
        yield children.some(match ?? isValue);
        yielded = true;
    }
    if (!yielded) return false;

    function isValue(vnode: VNode): unknown {
        return vnode.source;
    }
}

interface EventuallyProps<O = unknown> {
    match?: unknown;
    flush?: boolean;
    output?: O;
}

async function *Eventually<O = unknown>({ match, flush, output }: EventuallyProps<O>, input: VNode): AsyncIterable<O> {
    const matched = await eventually(input, match, flush);
    if (!matched) return;
    yield output;
}

interface IfProps<O = unknown> {
    true?: O;
    false?: O;
    flush?: boolean;
}

async function *If<O>({ flush, true: trueOutput, false: falseOutput }: IfProps<O>, input: VNode): AsyncIterable<O> {
    const matched = await eventually(<Every>{input}</Every>, true, flush);
    if (matched) {
        yield trueOutput;
    } else {
        yield falseOutput;
    }
}

describe("Logic", function () {

    it("every", async () => {
        function *Thing() {
            yield <Every>{0}</Every>;
            yield <Every>{0}{1}</Every>;
            yield <Every>{1}{0}</Every>;
            yield <Every>{1}{1}</Every>;
        }
        await assertEventually(<Thing />, true, true);
    });

    it("some", async () => {
        function *Thing() {
            yield <Some>{0}</Some>;
            yield <Some>{0}{1}</Some>;
            yield <Some>{1}{0}</Some>;
            yield <Some>{1}{1}</Some>;
        }
        await assertEventually(<Thing />, true, true);
    });

    describe("if", function () {

        it("true", async function () {
            const expected = Math.random();
            await assertEventually(<If true={expected}>{true}</If>, expected, true);
        });

        it("false", async function () {
            const expected = Math.random();
            await assertEventually(<If false={expected}>{false}</If>, expected, true);
        });

    });

    async function assertEventually(node: VNode, match: unknown, flush = false) {
        expect(await eventually(node, match, flush)).toBeTruthy();
    }
});

async function eventually(node: VNode, match: unknown, flush: boolean = false) {
    let value: unknown = undefined,
        yielded = false;
    for await (const [result] of sources(node).children) {
        expect(isVNode(result)).toBeTruthy();
        const { source } = result;
        value = source;
        if (!flush && value === match) {
            console.trace({ value, match, flush });
            return true;
        }
        yielded = true;
    }

    if (!yielded) {
        // If no yield and match is undefined we still want to return false
        return false;
    }

    console.trace({ value, match });

    return value === match;
}

type SourceVNode = VNode & { source: SourceReference };
function sources(node: VNode): VNode & { children: AsyncIterable<SourceVNode[]> } {
    return filtered(node, isSourceVNode);

    function isSourceVNode(node: VNode): node is SourceVNode {
        return isSourceReference(node.source) && node.source !== node.reference;
    }
}
