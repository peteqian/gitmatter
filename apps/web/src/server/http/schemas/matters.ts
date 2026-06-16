import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["organization", "individual"]).optional(),
  clientNumber: z.string().optional(),
});

export const createMatterSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  practiceArea: z.string().optional(),
  adverseParties: z.array(z.string()).optional(),
});

export const updateMatterSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  practiceArea: z.string().nullish(),
  jurisdiction: z.string().nullish(),
  status: z.enum(["open", "closed"]).optional(),
  conflictCleared: z.boolean().optional(),
  conflictNotes: z.string().nullish(),
});

export const conflictsCheckSchema = z.object({
  clientName: z.string().min(1),
  adverseParties: z.array(z.string()).optional(),
});

export const clearConflictsSchema = z.object({ notes: z.string().optional() });

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "editor", "viewer"]).optional(),
});
