import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "users.manage")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const id = Number(params.id);
  const data = await req.json();
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const updateData = {
    name: data.name ?? before.name,
    role: data.role ?? before.role,
    active: data.active != null ? data.active : before.active,
    permissions:
      data.permissions != null ? JSON.stringify(data.permissions) : before.permissions,
  };
  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }

  const updated = await prisma.user.update({ where: { id }, data: updateData });

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    details: { role: updated.role, active: updated.active },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    username: updated.username,
    role: updated.role,
    active: updated.active,
    permissions: updated.permissions,
  });
}
