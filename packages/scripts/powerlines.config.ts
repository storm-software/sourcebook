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

import { plugin as tsdown } from "@powerlines/plugin-tsdown";
import { defineConfig } from "powerlines/config";

export default defineConfig({
  input: ["src/read-config.ts"],
  output: {
    dts: false,
    format: ["esm"],
    minify: true
  },
  platform: "node",
  plugins: [tsdown({ dts: false, exports: false, unbundle: false })],
  resolve: {
    noExternal: ["c12"]
  }
});
