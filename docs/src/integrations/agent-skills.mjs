// Serves the repository's Agent Skills (<repo>/skills/<name>/SKILL.md) from the docs site:
//
//   /skill.md                                  -> the primary skill (create-kotodayori)
//   /.well-known/agent-skills/<name>/SKILL.md  -> every skill, byte-for-byte
//   /.well-known/agent-skills/index.json       -> discovery index
//
// The index follows the Agent Skills Discovery RFC v0.2.0 (draft):
// https://github.com/cloudflare/agent-skills-discovery-rfc
//
// SKILL.md files are read at build time from <repo>/skills/, so the docs site keeps no copy.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const SKILLS_URL = new URL('../../../skills/', import.meta.url);
export const PRIMARY_SKILL = 'create-kotodayori';
export const DISCOVERY_SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

const VIRTUAL_ID = 'virtual:kotodayori/agent-skills';

export function skillPath(name) {
  return `/.well-known/agent-skills/${name}/SKILL.md`;
}

function readFrontmatter(name, text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!match) {
    throw new Error(`skills/${name}/SKILL.md has no YAML frontmatter`);
  }
  const data = parse(match[1]);
  if (data?.name !== name) {
    throw new Error(`skills/${name}/SKILL.md: frontmatter name "${data?.name}" must match the directory name`);
  }
  if (typeof data.description !== 'string' || data.description.trim() === '') {
    throw new Error(`skills/${name}/SKILL.md: description is required`);
  }
  return data;
}

/** Read every skills/<name>/SKILL.md as raw bytes, with its frontmatter and sha256 digest. */
export function loadSkills(skillsUrl = SKILLS_URL) {
  return readdirSync(skillsUrl, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .map(name => {
      const bytes = readFileSync(new URL(`${name}/SKILL.md`, skillsUrl));
      const { description } = readFrontmatter(name, bytes.toString('utf-8'));
      return {
        name,
        description: description.trim(),
        digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        base64: bytes.toString('base64'),
      };
    });
}

/** Text for the llms.txt "details" block: where the skills are and how to install them. */
export function llmsTxtSkillDetails(site, skills = loadSkills()) {
  const lines = skills.map(skill => `- [${skill.name}](${new URL(skillPath(skill.name), site)}): ${skill.description.split('. ')[0].replace(/\.$/, '')}.`);

  return [
    'Agent Skills ([specification](https://agentskills.io/specification)) for coding agents working with Kotodayori:',
    '',
    ...lines,
    `- [Discovery index](${new URL('/.well-known/agent-skills/index.json', site)}): every skill with its URL and sha256 digest.`,
    '',
    `Install a skill into a project with \`npx skills add hideokamoto/kotodayori --skill ${PRIMARY_SKILL} -y\` (or \`--skill kotodayori-webhooks\`). The primary skill is also served at ${new URL('/skill.md', site)}.`,
  ].join('\n');
}

/** Astro integration that injects the skill routes. */
export default function agentSkills() {
  return {
    name: 'kotodayori-agent-skills',
    hooks: {
      'astro:config:setup'({ injectRoute, updateConfig, addWatchFile }) {
        const skills = loadSkills();
        if (!skills.some(skill => skill.name === PRIMARY_SKILL)) {
          throw new Error(`skills/${PRIMARY_SKILL}/SKILL.md is missing`);
        }
        for (const skill of skills) {
          addWatchFile(new URL(`${skill.name}/SKILL.md`, SKILLS_URL));
        }

        const entry = file => fileURLToPath(new URL(`../lib/agent-skills/${file}`, import.meta.url));
        injectRoute({ pattern: '/skill.md', entrypoint: entry('skill-md.ts'), prerender: true });
        injectRoute({ pattern: '/.well-known/agent-skills/[name]/SKILL.md', entrypoint: entry('skill-file.ts'), prerender: true });
        injectRoute({ pattern: '/.well-known/agent-skills/index.json', entrypoint: entry('index-json.ts'), prerender: true });

        const source = `export const skills = ${JSON.stringify(skills)};\n` +
          `export const primarySkill = ${JSON.stringify(PRIMARY_SKILL)};\n` +
          `export const discoverySchema = ${JSON.stringify(DISCOVERY_SCHEMA)};\n`;
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'kotodayori-agent-skills',
                resolveId(id) {
                  if (id === VIRTUAL_ID) {
                    return `\0${VIRTUAL_ID}`;
                  }
                },
                load(id) {
                  if (id === `\0${VIRTUAL_ID}`) {
                    return source;
                  }
                },
              },
            ],
          },
        });
      },
    },
  };
}
