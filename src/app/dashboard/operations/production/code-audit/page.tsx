import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";
import { ClientCodeAuditWorkspace } from "./ClientCodeAuditWorkspace";

export default function ClientCodeAuditPage() {
  return (
    <OperationsWorkspaceShell title="Client Code Audit" purpose="Turn a client ZIP into a prioritized, downloadable static-review package without using AI credits or executing client code.">
      <ClientCodeAuditWorkspace />
    </OperationsWorkspaceShell>
  );
}
