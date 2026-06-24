import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.01tDJYYd.js","_app/immutable/chunks/BomhsrGC.js","_app/immutable/chunks/m1yKd9Hb.js","_app/immutable/chunks/gYCBdZBz.js","_app/immutable/chunks/DIXEe1SP.js","_app/immutable/chunks/BZFPSWeI.js","_app/immutable/chunks/DgPznraf.js","_app/immutable/chunks/DK8VYm0h.js","_app/immutable/chunks/C2bHJZiv.js","_app/immutable/chunks/D9b6EI0G.js"];
export const stylesheets = [];
export const fonts = [];
