import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db/client";
import {
  type ArtifactType,
  type MatterRole,
  documents,
  matterMembers,
  matters,
  tabularReviews,
  user,
  workflows,
} from "@workspace/db/schema";

// Re-export so consumers can name the role type without reaching into the db pkg.
export type { MatterRole } from "@workspace/db/schema";

// Ordered so a higher role satisfies a lower requirement.
const ROLE_RANK: Record<MatterRole, number> = { viewer: 0, editor: 1, owner: 2 };

/** The tenant a user belongs to, or null if unassigned. */
export async function getUserTenant(userId: string): Promise<string | null> {
  const [row] = await db.select({ tenantId: user.tenantId }).from(user).where(eq(user.id, userId));
  return row?.tenantId ?? null;
}

/** True if the user belongs to the given tenant. */
export async function sameTenant(userId: string, tenantId: string): Promise<boolean> {
  return (await getUserTenant(userId)) === tenantId;
}

// Artifact tables that carry a matterId + owner, keyed by artifact type.
// Chats carry a matterId too but are NOT artifacts (no commit spine, not in
// ArtifactType); chat routes check `hasMatterAccess` directly instead.
const MATTER_TABLE = {
  tabular_review: tabularReviews,
  workflow: workflows,
  document: documents,
} as const;

/** True if the user is a member of the matter with at least `min` role. */
export async function hasMatterAccess(
  userId: string,
  matterId: string,
  min: MatterRole = "viewer"
): Promise<boolean> {
  // Join the matter so we can assert same-tenant as defense-in-depth against
  // cross-tenant id injection (membership normally implies same tenant).
  const [row] = await db
    .select({ role: matterMembers.role, matterTenant: matters.tenantId, userTenant: user.tenantId })
    .from(matterMembers)
    .innerJoin(matters, eq(matterMembers.matterId, matters.id))
    .innerJoin(user, eq(matterMembers.userId, user.id))
    .where(and(eq(matterMembers.matterId, matterId), eq(matterMembers.userId, userId)));
  if (!row) return false;
  if (row.matterTenant !== row.userTenant) return false;
  return ROLE_RANK[row.role] >= ROLE_RANK[min];
}

/**
 * Resolve an artifact to its matter and check the caller's access. The single
 * chokepoint replacing the scattered `artifact.userId === user.id` checks.
 *
 * During the matter rollout an artifact may have a null matterId (not yet
 * backfilled); those fall back to owner-only access. Once every artifact is
 * matter-scoped (NOT NULL), the fallback becomes dead and can be removed.
 *
 * Note: globally-readable resources (e.g. system workflows, which have null
 * userId + null matterId) return false here — do NOT route their reads through
 * this guard; the route layer permits them via the `isSystem` flag.
 */
export async function canAccessArtifact(
  userId: string,
  artifactType: ArtifactType,
  artifactId: string,
  min: MatterRole = "viewer"
): Promise<boolean> {
  const table = MATTER_TABLE[artifactType];
  if (!table) throw new Error(`canAccessArtifact: unsupported artifact type "${artifactType}"`);
  const [row] = await db
    .select({ matterId: table.matterId, ownerId: table.userId })
    .from(table)
    .where(eq(table.id, artifactId));
  if (!row) return false;
  if (!row.matterId) return row.ownerId === userId;
  return hasMatterAccess(userId, row.matterId, min);
}
