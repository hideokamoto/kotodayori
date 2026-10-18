declare module 'virtual:kotodayori/agent-skills' {
  export interface ServedSkill {
    name: string;
    description: string;
    /** `sha256:<hex>` of the raw SKILL.md bytes. */
    digest: string;
    /** Raw SKILL.md bytes, base64-encoded. */
    base64: string;
  }
  export const skills: ServedSkill[];
  export const primarySkill: string;
  export const discoverySchema: string;
}
