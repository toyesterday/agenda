// This file provides a minimal set of type declarations for the Deno
// runtime, which is used by Supabase Edge Functions. This allows
// TypeScript to compile the functions without errors in an environment
// that doesn't have Deno types installed globally.

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}