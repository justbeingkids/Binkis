// Super admins can manage all admin users and view the audit log.
// Designated by email here (no DB migration needed). Compared lowercased.
const SUPER_ADMIN_EMAILS = new Set<string>(["xautosolution@gmail.com"]);

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
