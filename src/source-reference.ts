/**
 * A scalar source reference that can be transmitted or stored
 */
export type MarshalledSourceReference = string | number | boolean;
/**
 * A scalar source reference, this could be either referencing a {@link NativeVNode} or referencing direct source
 */
export type SourceReference = MarshalledSourceReference | symbol;

/**
 * Indicates if a value is a {@link MarshalledSourceReference}
 * @param value
 */
export function isMarshalledSourceReference(value: unknown): value is MarshalledSourceReference {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Indicates if a value is a {@link SourceReference}
 * @param value
 */
export function isSourceReference(value: unknown): value is SourceReference {
  return (
    typeof value === "symbol" ||
    isMarshalledSourceReference(value)
  );
}
