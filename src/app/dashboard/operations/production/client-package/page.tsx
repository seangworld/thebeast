import { BeastAdminShell } from "../../../admin/BeastAdminShell";
import { ClientDeliveryWorkspace } from "./ClientDeliveryWorkspace";

export default function ClientDeliveryPage() {
  return <BeastAdminShell title="Client Delivery Package" purpose="Bundle finished work with a clear, professional handoff package you can review and send to the client."><ClientDeliveryWorkspace /></BeastAdminShell>;
}
