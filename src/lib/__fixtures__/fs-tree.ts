import type { FsTree } from "../types";

export const mockFs: FsTree = {
  root: {
    name: "~",
    type: "dir",
    children: [
      {
        name: "blog",
        type: "dir",
        children: [
          {
            name: "hello-world.md",
            type: "file",
            path: "blog/hello-world.md",
            title: "Hello World",
            date: "2024-01-20",
          },
        ],
      },
      {
        name: "docs",
        type: "dir",
        children: [
          {
            name: "frontend",
            type: "dir",
            children: [
              {
                name: "react-hooks.md",
                type: "file",
                path: "docs/frontend/react-hooks.md",
                title: "React Hooks",
                date: "2024-03-15",
              },
            ],
          },
        ],
      },
      {
        name: "about.md",
        type: "file",
        path: "about.md",
        title: "About",
        date: "2024-01-01",
      },
    ],
  },
  files: [
    { name: "hello-world.md", type: "file", path: "blog/hello-world.md", title: "Hello World", date: "2024-01-20" },
    { name: "react-hooks.md", type: "file", path: "docs/frontend/react-hooks.md", title: "React Hooks", date: "2024-03-15" },
    { name: "about.md", type: "file", path: "about.md", title: "About", date: "2024-01-01" },
  ],
};
