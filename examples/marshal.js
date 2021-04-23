import { createNode, marshal, hydrateChildren } from "../dist/index.js";

const context = {
  hydrate: async (node, tree) => {
    console.log("Hydrate", { node, tree });
    await hydrateChildren(context, node, tree);
  }
};

const node = createNode(
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

marshal(node)
  .then(node => console.log("Marshalled", JSON.stringify(node, null, "  ")))
  .then(() => console.log("Complete"))
  .catch(error => console.error(error));


