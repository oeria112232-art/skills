import { useListUsers, useUpdateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const roleColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-600 dark:text-red-400",
  instructor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  student: "bg-green-500/10 text-green-600 dark:text-green-400",
};

export default function AdminUsersPage() {
  const { data: users, isLoading } = useListUsers();
  const updateUser = useUpdateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRoleChange = async (id: number, role: string) => {
    await updateUser.mutateAsync({ id, data: { role } });
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    toast({ title: "Role updated" });
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="heading-admin-users">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts and roles</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Points</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!users || users.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>No users</p></td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-muted/30" data-testid={`user-row-${u.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <p className="font-medium text-sm">{u.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-primary hidden md:table-cell">{u.points}</td>
                  <td className="px-4 py-3">
                    <Select value={u.role} onValueChange={v => handleRoleChange(u.id, v)}>
                      <SelectTrigger className="h-8 w-28 text-xs" data-testid={`select-user-role-${u.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
