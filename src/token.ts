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
  function token(): TokenVNode<T> {
    // Prevent the function from ever being called
    // We want all the types to line up correct but don't
    // want vnode to run this
    throw new Error("Not implemented");
  }
  Object.assign(token, {
    reference: Token,
    source: input
  });
  const tokenized: unknown = token;
  assertTokenVNode(tokenized, (value: unknown): value is T => value === input);
  return tokenized;
}

export function isTokenVNode<T extends SourceReference = SourceReference>(value: unknown, isTokenSource?: (value: unknown) => value is T): value is TokenVNode<T> {
  return typeof value === "function" && isVNode(value) && (isTokenSource ?? isSourceReference)(value.source) && value.reference === Token;
}

export function assertTokenVNode<T extends SourceReference = SourceReference>(value: unknown, isTokenSource?: (value: unknown) => value is T): asserts value is TokenVNode<T> {
  if (!isTokenVNode(value, isTokenSource)) {
    throw new Error("Expected TokenVNode");
  }
}
