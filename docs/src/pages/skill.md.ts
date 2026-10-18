import type { APIRoute } from 'astro';
import { PRIMARY_SKILL, loadAgentSkills } from '../lib/agent-skills.mjs';

export const prerender = true;

/** The create-kotodayori SKILL.md, byte for byte. */
export const GET: APIRoute = () => {
  const skill = loadAgentSkills().find(({ name }) => name === PRIMARY_SKILL);
  if (!skill) {
    throw new Error(`skills/${PRIMARY_SKILL}/SKILL.md not found`);
  }
  return new Response(new Uint8Array(skill.bytes), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
