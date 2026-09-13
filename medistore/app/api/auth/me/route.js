import { NextResponse } from "next/server";
import { getCurrentUser, userPermissions } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      permissions: userPermissions(user),
    },
  });
}
