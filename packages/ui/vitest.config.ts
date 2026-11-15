/* -------------------------------------------------------------------

                   🗲 Storm Software - Sourcebook

 This code was released as part of the Sourcebook project. Sourcebook
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/sourcebook.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/sourcebook
 Documentation:            https://docs.stormsoftware.com/projects/sourcebook
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: source("."),
  resolve: {
    alias: {
      "@sourcebook/config": source("../config/src/index.ts"),
      "@sourcebook/core": source("../core/src/index.ts"),
      // The same web aliases `@cyclone-ui/nextjs` and `@cyclone-ui/vite` set.
      "react-native-svg": "@tamagui/react-native-svg",
      "react-native": "react-native-web"
    }
  },
  test: {
    environment: "node",
    // Dependencies import `react-native`, so they go through the aliases too.
    server: { deps: { inline: [/@tamagui\//, /@cyclone-ui\//] } },
    include: ["src/**/*.test.{ts,tsx}"]
  }
});
