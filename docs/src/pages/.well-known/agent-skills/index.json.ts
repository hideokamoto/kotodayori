import type { APIRoute } from 'astro';
import { DISCOVERY_SCHEMA, loadAgentSkills, skillUrl } from '../../../lib/agent-skills.mjs';

export const prerender = true;

/**
 * Discovery index in the format of the Agent Skills Discovery RFC v0.2.0
 * (https://github.com/cloudflare/agent-skills-discovery-rfc).
 */
export const GET: APIRoute = () => {
  const index = {
    $schema: DISCOVERY_SCHEMA,
    skills: loadAgentSkills().map(({ name, description, digest }) => ({
      name,
      type: 'skill-md',
      description,
      url: skillUrl(name),
      digest,
    })),
  };
  return new Response(JSON.stringify(index, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json' },
  });
};
