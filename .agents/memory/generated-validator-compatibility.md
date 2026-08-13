---
name: Generated validator compatibility
description: OpenAPI-generated Zod schemas target the workspace's installed Zod runtime, so schema features need to stay within that runtime's supported API.
---

When adding OpenAPI fields, prefer portable constraints such as `type`, `minLength`, and `number` over newer format helpers that may generate unavailable Zod methods.

**Why:** The workspace's generated validation package currently resolves Zod 3 APIs even though some source packages use `zod/v4`; newer generated helpers such as `zod.email()` and `zod.int()` can break the library typecheck.

**How to apply:** After every OpenAPI change, run codegen and the library typecheck before wiring new generated schemas into the server.