/**
 * Jest BigInt Serialization Polyfill
 * Fixes: "TypeError: Do not know how to serialize a BigInt" error
 * 
 * Issue: Jest worker threads cannot serialize BigInt values when tests fail.
 * When a test assertion fails with BigInt values, jest-worker tries to 
 * serialize the error message but fails because BigInt is not JSON serializable.
 * 
 * Solution: Add toJSON() method to BigInt.prototype.
 * JSON.stringify() specifically checks for toJSON() method on BigInt values.
 * 
 * Reference: 
 * - https://github.com/jestjs/jest/issues/11617
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
 */

// Add toJSON method to BigInt.prototype for Jest serialization
// This is safe because it's a standard extension pattern
if (!BigInt.prototype.toJSON) {
  Object.defineProperty(BigInt.prototype, 'toJSON', {
    value: function () {
      return this.toString();
    },
    writable: true,
    configurable: true,
  });
}

// Also patch global BigInt constructor for edge cases
try {
  // Test that BigInt can be serialized
  const testBigInt = BigInt(123456789);
  JSON.stringify(testBigInt);
} catch (error) {
  // If direct JSON.stringify fails, the toJSON patch above will handle it
  console.log('[Jest Setup] BigInt serialization patched');
}

export {};
