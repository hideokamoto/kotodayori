import type { APIRoute, GetStaticPaths } from 'astro';
import { skills } from 'virtual:kotodayori/agent-skills';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = () => skills.map(({ name }) => ({ params: { name } }));

/** `/.well-known/agent-skills/<name>/SKILL.md`: the raw bytes of skills/<name>/SKILL.md. */
export const GET: APIRoute = ({ params }) => {
  const skill = skills.find(({ name }) => name === params.name)!;

  return new Response(Buffer.from(skill.base64, 'base64'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
