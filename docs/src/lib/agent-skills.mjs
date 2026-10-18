// Reads the distributable agent skills from the repository's `skills/` directory
// at build time. The docs site serves these bytes as-is; it never keeps a copy.
//
// Used by astro.config.mjs (names and descriptions for llms.txt) and by the
// endpoints under src/pages (the SKILL.md bytes and their digests).

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

/**
 * The repository's `skills/` directory. Like the changelog paths in
 * src/content.config.ts, this is resolved from the docs package directory,
 * which is the working directory of `astro dev` / `astro build`.
 */
export const SKILLS_DIR = path.resolve('../skills');

/** The skill served at `/skill.md`. */
export const PRIMARY_SKILL = 'create-kotodayori';

/** Agent Skills Discovery RFC v0.2.0 index schema. */
export const DISCOVERY_SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

/** @param {string} name */
export const skillUrl = (name) => `/.well-known/agent-skills/${name}/SKILL.md`;

/**
 * @typedef {object} AgentSkill
 * @property {string} name
 * @property {string} description
 * @property {Buffer} bytes Raw bytes of SKILL.md.
 * @property {string} digest `sha256:<hex>` of `bytes`.
 */

/**
 * @param {string} [skillsDir] Absolute path to the repository's `skills/` directory.
 * @returns {AgentSkill[]}
 */
export function loadAgentSkills(skillsDir = SKILLS_DIR) {
  return readdirSync(skillsDir)
    .filter((entry) => statSync(path.join(skillsDir, entry)).isDirectory())
    .sort()
    .map((dir) => {
      const file = path.join(skillsDir, dir, 'SKILL.md');
      const bytes = readFileSync(file);
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(bytes.toString('utf-8'));
      if (!match) {
        throw new Error(`${file}: missing YAML frontmatter`);
      }
      const { name, description } = parse(match[1]);
      if (name !== dir) {
        throw new Error(`${file}: frontmatter name "${name}" must match the directory name "${dir}"`);
      }
      if (typeof description !== 'string' || description.length === 0 || description.length > 1024) {
        throw new Error(`${file}: description must be 1-1024 characters`);
      }
      return {
        name,
        description: description.trim(),
        bytes,
        digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
      };
    });
}
