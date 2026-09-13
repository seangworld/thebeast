import { BeastAdminShell } from "../../../admin/BeastAdminShell";
import { ClientCodeAuditWorkspace } from "./ClientCodeAuditWorkspace";

export default function ClientCodeAuditPage() {
  return (
    <BeastAdminShell title="Client Code Audit" purpose="Turn a client ZIP into a prioritized, downloadable static-review package without using AI credits or executing client code.">
      <ClientCodeAuditWorkspace />
    </BeastAdminShell>
  );
}
