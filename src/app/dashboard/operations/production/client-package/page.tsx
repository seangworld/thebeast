import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";
import { ClientDeliveryWorkspace } from "./ClientDeliveryWorkspace";

export default function ClientDeliveryPage() {
  return <OperationsWorkspaceShell title="Client Delivery Package" purpose="Bundle finished work with a clear, professional handoff package you can review and send to the client."><ClientDeliveryWorkspace /></OperationsWorkspaceShell>;
}
