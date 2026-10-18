import type { APIRoute } from 'astro';
import { primarySkill, skills } from 'virtual:kotodayori/agent-skills';

export const prerender = true;

/** `/skill.md`: the raw bytes of skills/create-kotodayori/SKILL.md. */
export const GET: APIRoute = () => {
  const skill = skills.find(({ name }) => name === primarySkill)!;

  return new Response(Buffer.from(skill.base64, 'base64'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
