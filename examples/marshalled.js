import { createVNode, hydrate, hydrateChildren } from "../dist/index.js";
import { asyncExtendedIterable } from "iterable";

const context = {
  hydrate: async (node, tree) => {
    console.log("Hydrate", { node, tree });
    await hydrateChildren(context, node, tree);
  }
};

const node = createVNode(
  context,
  {
    reference: 1,
    source: "main",
    options: {
      class: "main-content"
    },
    children: [
      [
        {
          reference: 2,
          source: "button",
          options: {
            class: "primary"
          },
          children: [
            ["I am a primary button"]
          ]
        },
        {
          reference: 3,
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
          reference: 2,
          source: "button",
          options: {
            class: "primary"
          },
          children: [
            ["I am a primary button"]
          ]
        },
        {
          reference: 3,
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

hydrate(context, node)
  .then(() => console.log("Complete"))
  .catch(error => console.error(error));


