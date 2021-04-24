import { isSourceReference, SourceReference } from "./source-reference";
import { isVNode, VNode, VNodeRepresentationSource } from "./vnode";
import { assert } from "./assert";
import { createNode } from "./create-node";
import { createFragment, Fragment } from "./fragment";
import { filtered, filteredChildren } from "./filter";

export const Token = Symbol.for("@opennetwork/vnode/token");

export const IsTokenOptions = Symbol.for("@opennetwork/vnode/token/isTokenOptions");

export type TokenOptionsRecord = Record<string | symbol | number, unknown>;

export interface TokenOptions extends TokenOptionsRecord {
  [IsTokenOptions]?(value: unknown): boolean;
}

export interface IsTokenSourceVNodeFn<T extends SourceReference = SourceReference> {
  (value: unknown): value is T;
}

export interface IsTokenOptionsVNodeFn<O extends object = object> {
  (value: unknown): value is O;
}

export interface IsTokenVNodeFn<T extends SourceReference = SourceReference, O extends object = object> {
  (value: unknown): value is TokenVNode<T, O>;
}

export interface IsTokenVNodeFnFn<T extends SourceReference = SourceReference, O extends object = object> {
  (value: unknown): value is TokenVNodeFn<T, O>;
}

export interface AssertTokenVNodeFn<T extends SourceReference = SourceReference, O extends object = object> {
  (value: unknown): asserts value is TokenVNode<T, O>;
}

export interface AssertTokenVNodeFnFn<T extends SourceReference = SourceReference, O extends object = object> {
  (value: unknown): value is TokenVNodeFn<T, O>;
}

export interface TokenVNode<T extends SourceReference = SourceReference, O extends object = object> extends VNode {
  options: O & TokenOptions;
  source: T;
  reference: typeof Token;
  isTokenSource: IsTokenSourceVNodeFn<T>;
  isTokenOptions: IsTokenOptionsVNodeFn<O>;
  is: IsTokenVNodeFn<T, O>;
  isFn: IsTokenVNodeFnFn<T, O>;
  assert: AssertTokenVNodeFn<T, O>;
  assertFn: AssertTokenVNodeFnFn<T, O>;
}

export interface TokenVNodeFn<T extends SourceReference = SourceReference, O extends object = object> extends TokenVNode<T, O & TokenOptionsRecord> {
  (options?: Partial<O | TokenOptionsRecord>, child?: VNode): TokenVNode<T, O & TokenOptionsRecord>;
}

export function createToken<T extends SourceReference, O extends object = object>(source: T, options?: O, ...children: VNodeRepresentationSource[]): TokenVNodeFn<T, O> {
  type Token = TokenVNodeFn<T, O>;
  let tokenized: TokenVNodeFn<T, O>;
  const isOptionsOptions = isOptionsIsOptions(options) ? options : undefined;
  function token(this: unknown, partialOptions?: Partial<O>, child?: VNode): TokenVNode<T, O> {
    const node = isTokenVNode<T, O & TokenOptions>(this) ? this : tokenized;
    let nextNode: Pick<Token, keyof Token> = node;
    if (partialOptions && hasOwnPropertyAvailable(partialOptions)) {
      nextNode = {
        ...nextNode,
        options: {
          ...nextNode.options,
          ...partialOptions
        }
      };
    }
    if (child) {
      nextNode = {
        ...nextNode,
        children: createFragment(undefined, child).children
      };
    }
    assertTokenVNode<T, O>(nextNode, node.isTokenSource, isOptionsOptions?.[IsTokenOptions] ?? ((value): value is O => value === nextNode.options));
    if (nextNode === node) {
      // Terminates the node, will no longer be a function
      return {
        ...nextNode
      };
    } else {
      return nextNode;
    }
  }
  Object.assign(token, {
    reference: Token,
    source,
    options,
    isTokenSource,
    isTokenOptions,
    assert,
    assertFn,
    is,
    isFn,
    children: children.length ? createFragment(undefined, ...children).children : undefined
  });
  const almost: unknown = token;
  assertTokenVNodeFn<T, O>(almost, isTokenSource, isOptionsOptions?.[IsTokenOptions] ?? ((value): value is O => Object.is(value, options)));
  tokenized = almost;
  return tokenized;

  function is(value: unknown): value is TokenVNode<T, O> {
    return isTokenVNode(value, isTokenSource, isTokenOptions);
  }

  function isFn(value: unknown): value is TokenVNode<T, O> {
    return isTokenVNodeFn(value, isTokenSource, isTokenOptions);
  }

  function assert(value: unknown): asserts value is TokenVNode<T, O> {
    return assertTokenVNode(value, isTokenSource, isTokenOptions);
  }

  function assertFn(value: unknown): asserts value is TokenVNode<T, O> {
    return assertTokenVNodeFn(value, isTokenSource, isTokenOptions);
  }

  function isTokenSource(value: unknown): value is T {
    return Object.is(value, source);
  }

  function isTokenOptions(value: unknown): value is O {
    return isOptionsOptions?.[IsTokenOptions]?.(value) ?? true;
  }

  function isOptionsIsOptions(value: unknown): value is { [IsTokenOptions](value: unknown): value is O } {
    function isOptionsIsOptionsLike(value: unknown): value is { [IsTokenOptions]: unknown } {
      return !!value;
    }
    return options === value && isOptionsIsOptionsLike(value) && typeof value[IsTokenOptions] === "function";
  }
}

export function isTokenVNode<T extends SourceReference = SourceReference, O extends object = object>(value: unknown, isTokenSource?: (value: unknown) => value is T, isTokenOptions?: (value: unknown) => value is O): value is TokenVNode<T, O> {
  return isVNode(value) && (typeof isTokenSource === "function" ? isTokenSource : isSourceReference)(value.source) && value.reference === Token && (typeof isTokenOptions === "function" ? isTokenOptions(value.options) : true);
}

export function isTokenVNodeFn<T extends SourceReference = SourceReference, O extends object = object>(value: unknown, isTokenSource?: (value: unknown) => value is T, isTokenOptions?: (value: unknown) => value is O): value is TokenVNodeFn<T, O> {
  return typeof value === "function" && isTokenVNode(value, isTokenSource, isTokenOptions);
}

export function assertTokenVNode<T extends SourceReference = SourceReference, O extends object = object>(value: unknown, isTokenSource?: (value: unknown) => value is T, isTokenOptions?: (value: unknown) => value is O): asserts value is TokenVNode<T, O> {
  return assert(value, {
    is(value): value is TokenVNode<T, O> {
      return isTokenVNode(value, isTokenSource, isTokenOptions);
    },
    message: "Expected TokenVNode"
  });
}

export function assertTokenVNodeFn<T extends SourceReference = SourceReference, O extends object = object>(value: unknown, isTokenSource?: (value: unknown) => value is T, isTokenOptions?: (value: unknown) => value is O): asserts value is TokenVNodeFn<T, O> {
  return assert(value, {
    is(value): value is TokenVNodeFn<T, O> {
      return isTokenVNodeFn(value, isTokenSource, isTokenOptions);
    },
    message: "Expected TokenVNode function"
  });
}

function hasOwnPropertyAvailable(object: object) {
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      return true;
    }
  }
  return false;
}
