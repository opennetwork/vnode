import { isSourceReference, SourceReference } from "./source-reference";
import { isVNode, VNode } from "./vnode";

export const Token = Symbol.for("@opennetwork/vnode/token");

export interface TokenVNode<T extends SourceReference> extends VNode {
  (...args: unknown[]): TokenVNode<T>;
  source: T;
  reference: typeof Token;
  children: never;
}

export function createToken<T extends SourceReference>(input: T): TokenVNode<T> {
  // Type yoga
  let tokenized: TokenVNode<T>;
  function token(): TokenVNode<T> {
    return tokenized;
  }
  Object.assign(token, {
    reference: Token,
    source: input
  });
  const almost: unknown = token;
  assertTokenVNode(almost, (value: unknown): value is T => value === input);
  tokenized = almost;
  return almost;
}

export function isTokenVNode<T extends SourceReference = SourceReference>(value: unknown, isTokenSource?: (value: unknown) => value is T): value is TokenVNode<T> {
  return typeof value === "function" && isVNode(value) && (isTokenSource ?? isSourceReference)(value.source) && value.reference === Token;
}

export function assertTokenVNode<T extends SourceReference = SourceReference>(value: unknown, isTokenSource?: (value: unknown) => value is T): asserts value is TokenVNode<T> {
  if (!isTokenVNode(value, isTokenSource)) {
    throw new Error("Expected TokenVNode");
  }
}
