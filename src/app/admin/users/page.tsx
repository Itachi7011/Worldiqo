import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import UserTable from "@/components/admin/UserTable";

export default async function AdminUsersPage() {
  const session = await auth();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold mb-1">Users</h1>
        <p className="text-sm text-muted">{users.length} registered account(s).</p>
      </div>
      <UserTable users={users} currentUserId={session!.user.id} />
    </div>
  );
}
