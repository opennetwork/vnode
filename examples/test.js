import {
  isFragmentVNode as isFragmentVNodeFn,
  isScalarVNode as isScalarVNodeFn,
  isNativeVNode as isNativeVNodeFn,
  isHydratedVNode as isHydratedVNodeFn,
  isVNode as isVNodeFn,
  Fragment,
  WeakVContext,
  createVContextEvents as createVContextEventsFn
} from "../dist/index.js";
import {
  isFragmentVNode,
  isScalarVNode,
  isNativeVNode,
  isHydratedVNode,
  isVNode,
  isWeakVContextConstructor,
  createVContextEvents
} from "@opennetwork/vnode-test";

export async function run() {
  isFragmentVNode(isFragmentVNodeFn, Fragment);
  isScalarVNode(isScalarVNodeFn);
  isNativeVNode(isNativeVNodeFn);
  isHydratedVNode(isHydratedVNodeFn);
  isVNode(isVNodeFn, Fragment);
  await isWeakVContextConstructor(WeakVContext);
  await createVContextEvents(createVContextEventsFn);
}

run()
  .then(() => console.log("Complete"))
  .catch(error => console.error(error));
