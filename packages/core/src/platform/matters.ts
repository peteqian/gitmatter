import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@workspace/db/client";
import {
  type MatterRole,
  clients,
  contracts,
  documents,
  matterMembers,
  matters,
  tabularReviews,
  user,
} from "@workspace/db/schema";

// Clients and matters are firm organization, not commit-spine artifacts — plain
// CRUD with a `createdBy` audit column. Access to the WORK inside a matter is
// governed by matter_members (see the core access guard).

// ---- Clients ----

export async function createClient(
  creatorId: string,
  input: { name: string; type?: "organization" | "individual"; clientNumber?: string }
) {
  const [row] = await db
    .insert(clients)
    .values({
      name: input.name,
      type: input.type ?? "organization",
      clientNumber: input.clientNumber ?? null,
      createdBy: creatorId,
    })
    .returning();
  return row!;
}

export async function listClients() {
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClient(id: string) {
  const [row] = await db.select().from(clients).where(eq(clients.id, id));
  return row ?? null;
}

/** Client plus the work under it the user can see: their matters on this client,
 *  and the documents/contracts/reviews filed under those matters. Returns null if
 *  the client doesn't exist. Artifact lists are empty when the user has no matters. */
export async function getClientOverview(userId: string, clientId: string) {
  const client = await getClient(clientId);
  if (!client) return null;

  const matterRows = await db
    .select({ matter: matters, role: matterMembers.role })
    .from(matterMembers)
    .innerJoin(matters, eq(matterMembers.matterId, matters.id))
    .where(and(eq(matterMembers.userId, userId), eq(matters.clientId, clientId)))
    .orderBy(desc(matters.updatedAt));

  const matterIds = matterRows.map((r) => r.matter.id);
  if (!matterIds.length) {
    return { client, matters: matterRows, documents: [], contracts: [], reviews: [] };
  }

  const [documentRows, contractRows, reviewRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        title: documents.title,
        fileType: documents.fileType,
        status: documents.status,
        matterId: documents.matterId,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(inArray(documents.matterId, matterIds))
      .orderBy(desc(documents.createdAt)),
    db
      .select({
        id: contracts.id,
        title: contracts.title,
        matterId: contracts.matterId,
        createdAt: contracts.createdAt,
      })
      .from(contracts)
      .where(inArray(contracts.matterId, matterIds))
      .orderBy(desc(contracts.createdAt)),
    db
      .select({
        id: tabularReviews.id,
        title: tabularReviews.title,
        matterId: tabularReviews.matterId,
        createdAt: tabularReviews.createdAt,
      })
      .from(tabularReviews)
      .where(inArray(tabularReviews.matterId, matterIds))
      .orderBy(desc(tabularReviews.createdAt)),
  ]);

  return {
    client,
    matters: matterRows,
    documents: documentRows,
    contracts: contractRows,
    reviews: reviewRows,
  };
}

// ---- Matters ----

type MatterInput = {
  clientId: string;
  name: string;
  matterNumber?: string;
  practiceArea?: string;
  adverseParties?: string[];
};

/** Create a matter and add the creator as its `owner` member, atomically. */
export async function createMatter(creatorId: string, input: MatterInput) {
  return db.transaction(async (tx) => {
    const [matter] = await tx
      .insert(matters)
      .values({
        clientId: input.clientId,
        name: input.name,
        matterNumber: input.matterNumber ?? null,
        practiceArea: input.practiceArea ?? null,
        adverseParties: input.adverseParties ?? null,
        createdBy: creatorId,
        leadAttorney: creatorId,
      })
      .returning();
    await tx
      .insert(matterMembers)
      .values({ matterId: matter!.id, userId: creatorId, role: "owner" });
    return matter!;
  });
}

/** Matters the user is staffed on, newest first, with the client and the user's role. */
export async function listMattersForUser(userId: string) {
  return db
    .select({ matter: matters, client: clients, role: matterMembers.role })
    .from(matterMembers)
    .innerJoin(matters, eq(matterMembers.matterId, matters.id))
    .innerJoin(clients, eq(matters.clientId, clients.id))
    .where(eq(matterMembers.userId, userId))
    .orderBy(desc(matters.updatedAt));
}

export async function getMatter(id: string) {
  const [row] = await db.select().from(matters).where(eq(matters.id, id));
  return row ?? null;
}

export async function closeMatter(id: string) {
  await db
    .update(matters)
    .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
    .where(eq(matters.id, id));
}

/** Record a conflicts clearance after the user has reviewed any matches. */
export async function clearConflicts(id: string, notes?: string) {
  await db
    .update(matters)
    .set({ conflictCleared: true, conflictNotes: notes ?? null, updatedAt: new Date() })
    .where(eq(matters.id, id));
}

// ---- Members ----

export async function listMembers(matterId: string) {
  return db
    .select({
      userId: matterMembers.userId,
      role: matterMembers.role,
      addedAt: matterMembers.addedAt,
      name: user.name,
      email: user.email,
    })
    .from(matterMembers)
    .innerJoin(user, eq(matterMembers.userId, user.id))
    .where(eq(matterMembers.matterId, matterId));
}

export async function addMember(matterId: string, userId: string, role: MatterRole = "editor") {
  await db
    .insert(matterMembers)
    .values({ matterId, userId, role })
    .onConflictDoUpdate({ target: [matterMembers.matterId, matterMembers.userId], set: { role } });
}

/** Remove a member. Refuses to remove the matter's last owner (would orphan it). */
export async function removeMember(matterId: string, userId: string) {
  const owners = await db
    .select({ userId: matterMembers.userId })
    .from(matterMembers)
    .where(and(eq(matterMembers.matterId, matterId), eq(matterMembers.role, "owner")));
  if (owners.length <= 1 && owners.some((o) => o.userId === userId)) {
    throw new Error("cannot remove the last owner of a matter");
  }
  await db
    .delete(matterMembers)
    .where(and(eq(matterMembers.matterId, matterId), eq(matterMembers.userId, userId)));
}

// ---- Firm user directory ----

/** Substring search over the firm's users by name or email. */
export async function searchUsers(q: string) {
  const term = `%${q}%`;
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(or(ilike(user.name, term), ilike(user.email, term)))
    .limit(20);
}

// ---- Conflicts ----

/** Lightweight conflict check: does the new client/adverse-party overlap an
 *  existing client or another matter's adverse parties? Returns the matches. */
export async function checkConflicts(input: { clientName: string; adverseParties?: string[] }) {
  const names = new Set(
    [input.clientName, ...(input.adverseParties ?? [])].map((n) => n.toLowerCase().trim())
  );
  const [existingClients, existingMatters] = await Promise.all([
    db.select({ name: clients.name }).from(clients),
    db.select({ name: matters.name, adverseParties: matters.adverseParties }).from(matters),
  ]);
  const matches: string[] = [];
  for (const c of existingClients)
    if (names.has(c.name.toLowerCase().trim())) matches.push(`existing client "${c.name}"`);
  for (const m of existingMatters)
    for (const ap of m.adverseParties ?? [])
      if (names.has(ap.toLowerCase().trim()))
        matches.push(`adverse party "${ap}" on matter "${m.name}"`);
  return { matches };
}

// ---- Default matter ----

/** Every user has a home matter. Idempotent: returns the user's first matter, or
 *  creates a personal client + "General" matter + owner membership. */
export async function ensureDefaultMatter(userId: string, displayName: string): Promise<string> {
  const [existing] = await db
    .select({ id: matters.id })
    .from(matterMembers)
    .innerJoin(matters, eq(matterMembers.matterId, matters.id))
    .where(eq(matterMembers.userId, userId))
    .limit(1);
  if (existing) return existing.id;

  return db.transaction(async (tx) => {
    const [client] = await tx
      .insert(clients)
      .values({ name: `${displayName} (Personal)`, type: "individual", createdBy: userId })
      .returning();
    const [matter] = await tx
      .insert(matters)
      .values({
        clientId: client!.id,
        name: "General",
        createdBy: userId,
        leadAttorney: userId,
        conflictCleared: true,
      })
      .returning();
    await tx.insert(matterMembers).values({ matterId: matter!.id, userId, role: "owner" });
    return matter!.id;
  });
}
