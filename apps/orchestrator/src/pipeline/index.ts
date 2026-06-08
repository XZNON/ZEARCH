// The generation pipeline (query → interactive page). Stages compose here:
//   A classify  →  B ground  →  C generate
// Today only Stage C exists; A and B are added in later phases and wired in at this seam.

export { generateAppHTML } from './generate.js';
