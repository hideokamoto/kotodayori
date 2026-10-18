import type { APIRoute, GetStaticPaths } from 'astro';
import { loadAgentSkills } from '../../../../lib/agent-skills.mjs';

export const prerender = true;

export const getStaticPaths = (() =>
  loadAgentSkills().map((skill) => ({ params: { name: skill.name }, props: { skill } }))) satisfies GetStaticPaths;

/** skills/<name>/SKILL.md, byte for byte (Agent Skills Discovery RFC, `type: "skill-md"`). */
export const GET: APIRoute = ({ props }) =>
  new Response(new Uint8Array(props.skill.bytes), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
