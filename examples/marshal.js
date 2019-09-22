import { createVNode, marshal, hydrateChildren } from "../dist/index.js";
import { asyncExtendedIterable } from "iterable";

const context = {
  hydrate: async (node, tree) => {
    console.log("Hydrate", { node, tree });
    await hydrateChildren(context, node, tree);
  }
};

const instance = createVNode(
  context,
  {
    source: "main",
    options: {
      class: "main-content"
    },
    children: [
      [
        {
          source: "button",
          options: {
            class: "primary"
          },
          children: [
            ["I am a primary button"]
          ]
        },
        {
          source: "button",
          options: {
            class: "secondary"
          },
          children: [
            ["I am a secondary button"]
          ]
        }
      ],
      [
        {
          source: "button",
          options: {
            class: "primary"
          },
          children: [
            ["I am a primary button"]
          ]
        },
        {
          source: "button",
          options: {
            class: "primary"
          },
          children: [
            ["I am now a primary button"]
          ]
        }
      ]
    ]
  },
  {}
);

asyncExtendedIterable(instance)
  .forEach(async node => console.log("Marshalled", JSON.stringify(await marshal(node), null, "  ")))
  .then(() => console.log("Complete"))
  .catch(error => console.error(error));


