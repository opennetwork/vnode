import { VNode } from "./vnode";
import { LaneInput, merge } from "@opennetwork/progressive-merge";
import { Input } from "@opennetwork/progressive-merge/dist/async";

export async function *filteredChildren<Node extends VNode = VNode>(node: VNode, isNode: (node: VNode) => node is Node): AsyncIterable<Node[]> {
  if (!node.children) return;

  for await (const children of node.children) {
    if (!children.length) {
      continue;
    }
    if (children.every((node): node is Node => isNode(node))) {
      yield [...children];
      continue;
    }
    const lanes: LaneInput<Node[]> = children
      .map(sourcesChildren);
    const merged: AsyncIterable<ReadonlyArray<Node[] | undefined>> = merge(lanes);
    for await (const parts of merged) {
      yield parts.reduce<Node[]>(
        (updates , part) => updates.concat(part ?? []),
        []
      );
    }
  }

  function sourcesChildren(node: VNode): Input<Node[]> {
    return isNode(node) ? [[node]] : filtered(node, isNode).children;
  }
}

export function filtered<Node extends VNode = VNode>(node: VNode, isNode: (node: VNode) => node is Node): VNode & { children: AsyncIterable<Node[]> } {
  return {
    ...node,
    children: children(node)
  };
  function children(node: VNode): AsyncIterable<Node[]> {
    return {
      async *[Symbol.asyncIterator]() {
        yield *filteredChildren(node, isNode);
      }
    };
  }
}
