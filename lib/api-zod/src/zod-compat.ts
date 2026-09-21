import * as zod from "zod";

export * from "zod";

// Orval 8 emits the Zod 4 shorthand for integer schemas, while this workspace
// still uses Zod 3. Keep generated schemas compatible without changing their
// runtime validation semantics.
export const int = () => zod.number().int();
export const url = () => zod.string().url();