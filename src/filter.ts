import { VNode } from "./vnode";
import { MergeOptions } from "@opennetwork/progressive-merge";
import { Input } from "@opennetwork/progressive-merge/dist/async";
import { edgesUnion, DirectedEdge } from "./edges";

export async function *childrenFiltered<Node extends VNode = VNode>(node: VNode, isNode: (node: VNode) => node is Node, options: MergeOptions = {}): AsyncIterable<Node[]> {
  yield *edgesFiltered(node, "children", isNode, options);
}

export async function *edgesFiltered<Node extends VNode = VNode, D extends DirectedEdge = DirectedEdge>(node: VNode, direction: D, isNode: (node: VNode) => node is Node, options: MergeOptions = {}): AsyncIterable<Node[]> {
  if (!node[direction]) return;
  for await (const edges of node[direction]) {
    if (!edges.length) {
      yield []; // Intentional empty yield
    } else if (edges.every((node): node is Node => isNode(node))) {
      yield [...edges];
    } else {
      yield *edgesUnion(options, edges.map(sourcesChildren));
    }
  }
  function sourcesChildren(node: VNode): Input<Node[]> {
    return isNode(node) ? [[node]] : edgesFiltered(node, direction, isNode, options);
  }
}
