import type { APIRoute } from 'astro';
import { discoverySchema, skills } from 'virtual:kotodayori/agent-skills';

export const prerender = true;

/** `/.well-known/agent-skills/index.json` (Agent Skills Discovery RFC v0.2.0). */
export const GET: APIRoute = () => {
  const index = {
    $schema: discoverySchema,
    skills: skills.map(({ name, description, digest }) => ({
      name,
      type: 'skill-md',
      description,
      url: `/.well-known/agent-skills/${name}/SKILL.md`,
      digest,
    })),
  };

  return new Response(JSON.stringify(index, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json' },
  });
};
