import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "audit.view")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { id: "desc" },
    take: 500,
  });
  return NextResponse.json(logs);
}
