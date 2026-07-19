import { prisma } from "./prisma";

export async function logAudit({ userId, action, entity, entityId, details }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ?? null,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
