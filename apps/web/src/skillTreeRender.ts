import { SKILL_NODES, type JobId, type SkillNode } from "@bellgrave/combat";

export type SkillTreeFocus = "path" | "district" | "all";

export type SkillTreeEdge = { a: SkillNode; b: SkillNode; bridge: boolean };

/**
 * Nodes and links this view draws. Ownership never drops a node or an edge —
 * buying is the only way a node becomes yours, and the tree stays visible first.
 * District focus only scopes which island is on screen.
 */
export function skillTreeRenderSet(
  nodes: readonly SkillNode[],
  focus: SkillTreeFocus,
  district: JobId | "all",
): { nodes: SkillNode[]; edges: SkillTreeEdge[] } {
  const visible = (n: SkillNode): boolean => {
    if (focus !== "district" || district === "all") return true;
    if (n.job === district || n.id.startsWith("nexus_")) return true;
    return n.edges.some((e) => SKILL_NODES[e]?.job === district);
  };

  const shown = nodes.filter(visible);
  const shownIds = new Set(shown.map((n) => n.id));
  const seen = new Set<string>();
  const edges: SkillTreeEdge[] = [];
  for (const n of shown) {
    for (const eid of n.edges) {
      if (!shownIds.has(eid)) continue;
      const key = n.id < eid ? `${n.id}|${eid}` : `${eid}|${n.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const other = SKILL_NODES[eid];
      if (!other) continue;
      edges.push({
        a: n,
        b: other,
        bridge: n.job !== other.job || n.id.startsWith("nexus_") || eid.startsWith("nexus_"),
      });
    }
  }
  return { nodes: shown, edges };
}
