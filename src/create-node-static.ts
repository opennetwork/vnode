import {
  Source,
} from "./source";
import {
  SourceReference
} from "./source-reference";
import {
  FragmentVNode,
  VNode,
  VNodeRepresentationSource
} from "./vnode";
import { ChildrenResolution } from "./children";
import { Fragment } from "./fragment";

export type CreateNodeFragmentSourceFirstStage =
  | Function
  | Promise<unknown>
  | typeof Fragment;

export type CallFn<A extends unknown[], T extends <Z extends A>(...args: Z) => unknown> = ReturnType<T>;

type FunctionResolution<
  O extends object,
  S extends Function,
  C extends VNodeRepresentationSource,
> = S extends (options: O, children: VNode) => VNodeRepresentationSource ? ChildrenResolution<CallFn<[O, VNode], S>[]> : never;

type PromiseResolution<
  S extends Promise<VNodeRepresentationSource>
> = S extends Promise<infer R> ? R extends VNodeRepresentationSource ? ChildrenResolution<R[]> : never : never;

type FirstStageFragmentResolution<
  O extends object,
  C extends VNodeRepresentationSource
> = FragmentVNode & { options: O, children: AsyncIterable<ChildrenResolution<C[]>[]> };

export type FirstStageResolution<
  O extends object,
  S extends CreateNodeFragmentSourceFirstStage,
  C extends VNodeRepresentationSource
> =
  S extends Function ? FunctionResolution<O, S, C> :
  S extends Promise<VNodeRepresentationSource> ? PromiseResolution<S> :
  S extends typeof Fragment ? FirstStageFragmentResolution<O, C> :
  never;

export type CreateNodeFragmentSourceSecondStage =
  | AsyncIterable<unknown>
  | Iterable<unknown>
  | AsyncGenerator
  | IterableIterator<unknown>
  | undefined
  | null;

export interface CreateNodeFn<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  Output extends VNode = VNode
  > {
  <S extends CreateNodeFragmentSourceFirstStage>(source: S): FragmentVNode & {
    source: S;
    options: never;
    children: AsyncIterable<FirstStageResolution<never, S, never>[]>
  };
  <TO extends O, S extends CreateNodeFragmentSourceFirstStage>(source: S, options: TO): FragmentVNode & {
    source: S;
    options: TO;
    children: AsyncIterable<FirstStageResolution<TO, S, never>[]>
  };
  <TO extends O, S extends CreateNodeFragmentSourceFirstStage, TC extends C>(source: S, options?: TO, ...children: TC[]): FragmentVNode & {
    source: S;
    options: TO;
    children: AsyncIterable<FirstStageResolution<TO, S, TC>[]>
  };
  <Input extends FragmentVNode>(source: Input, ...throwAway: unknown[]): Input;
  <Input extends VNode>(source: Input, ...throwAway: unknown[]): Input;
  <TO extends O, S extends SourceReference>(source: S): VNode & {
    source: S;
    options: never;
    scalar: true;
    children: never;
  };
  <TO extends O, S extends SourceReference>(source: S, options?: TO): VNode & {
    source: S;
    options: TO;
    scalar: true;
    children: never;
  };
  <TO extends O, S extends SourceReference>(source: S, options?: TO, ...children: C[]): VNode & {
    source: S;
    options: TO;
    scalar: false;
  };
  <TO extends O, S extends CreateNodeFragmentSourceSecondStage>(source: S): FragmentVNode & {
    source: S;
    options: never;
    children: never;
  };
  <S extends CreateNodeFragmentSourceSecondStage>(source: S): FragmentVNode & {
    source: S;
    options: never;
    children: never;
  };
  <TO extends O, S extends CreateNodeFragmentSourceSecondStage>(source: S, options?: TO): FragmentVNode & {
    source: S;
    options: TO;
    children: AsyncIterable<VNode>
  };
  <TO extends O>(source: S, options?: TO, ...children: C[]): Output;
}

export type CreateNodeFnUndefinedOptionsCatch<
  Test extends (source: CreateNodeFragmentSourceFirstStage) => FragmentVNode & { source: CreateNodeFragmentSourceFirstStage, options: never }> = Test;
export type CreateNodeFnGivenOptionsCatch<
  Test extends (source: CreateNodeFragmentSourceFirstStage, options: { key: "value" }) => FragmentVNode & { source: CreateNodeFragmentSourceFirstStage, options: { key: "value" } }> = Test;

export type CreateNodeFnCatch<
  O extends object = object,
  S = Source<O>,
  C extends VNodeRepresentationSource = VNodeRepresentationSource,
  Output extends VNode = VNode,
  Test extends CreateNodeFn<O, S, C, Output> = CreateNodeFn<O, S, C, Output>
  > = Test;
