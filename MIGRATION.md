# Migrating to @usecolorbox/core

`@usecolorbox/core` is the successor to `@k-vyn/coloralgorithm`.
The initial release keeps version 2.0.0 to match the existing v2 API.

**Release status:** prepared, not yet published. Use the commands below only
after `npm view @usecolorbox/core@2.0.0 version` confirms the release exists.

## From @k-vyn/coloralgorithm v2

Install the replacement and remove the previous direct dependency:

```sh
npm install @usecolorbox/core@^2.0.0
npm uninstall @k-vyn/coloralgorithm
```

Change module names in JavaScript and TypeScript imports:

```diff
-import { generate, ColorAlgorithmError, ErrorCodes } from '@k-vyn/coloralgorithm';
-import type { ColorProps, ColorOptions, ColorResults } from '@k-vyn/coloralgorithm';
+import { generate, ColorAlgorithmError, ErrorCodes } from '@usecolorbox/core';
+import type { ColorProps, ColorOptions, ColorResults } from '@usecolorbox/core';
```

CommonJS consumers use:

```js
const { generate, ColorAlgorithmError, ErrorCodes } = require('@usecolorbox/core');
```

Keep your existing configuration and options. The exported generation API,
validation error codes, and generated palette values remain unchanged from v2.0.0.
The package now includes a dedicated CommonJS build and declaration file, so
`require()` also works on the supported Node 18 runtime without ESM interop.

Update imports of `generate` and `ColorAlgorithmError` together. Error constructors
from two separately installed packages are different identities; an error thrown
by one package will not pass `instanceof` against the other's constructor.

Commit the updated dependency lockfile and run your build, type checks, and tests.
Consumers of a library that depends on the old name should update that library;
installing the new package alone does not replace a transitive dependency.

## Migrate the dependency before changing source imports

If you need to keep the old module specifier temporarily, npm supports an alias:

```sh
npm install '@k-vyn/coloralgorithm@npm:@usecolorbox/core@^2.0.0'
```

This uses the new package for your direct dependency while existing imports still
resolve under `@k-vyn/coloralgorithm`. It does not rewrite other libraries'
dependencies. Remove the alias when updating your source imports.

## From v1

The move to v2 includes input validation. Invalid inputs that previously failed
silently now throw `ColorAlgorithmError`. Check your inputs and review the
[v2 upgrade notes](README.md#upgrading-to-v200) before changing a v1 dependency.
The package rename does not remove that major-version behavior change.

## Licensing and package availability

The core remains under the upstream [Apache-2.0 license](LICENSE.md). The previous
package's `license: "ISC"` metadata conflicted with its included Apache license;
this release aligns the metadata with that license and retains Lyft attribution.
No rights previously granted in upstream work are revoked by this migration.

The old package stays installable so existing lockfiles keep working. A migration
notice may be added after the replacement has been published and verified. There
is no automatic import rewrite, package redirect, or forced account requirement.
