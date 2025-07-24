// This is a workaround to allow TypeScript to process URL imports
// in Supabase Edge Functions without complaining. It doesn't provide
// type safety for these imports, but it resolves the compile-time errors.
declare module 'https://*';