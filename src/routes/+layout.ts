// Client-side only: game state lives in localStorage and there is nothing to
// server-render, so skipping SSR avoids compiling the whole component tree
// (including all of bits-ui) on the server for every dev start.
export const ssr = false;

// Emit the app shell as build/index.html for adapter-static.
export const prerender = true;
