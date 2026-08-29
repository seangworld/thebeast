import { BeastHomeShell } from "../BeastHomeShell";
import { BeastHomeInventoryWorkspace } from "./BeastHomeInventoryWorkspace";

export default function BeastHomeInventoryPage() {
  return <BeastHomeShell title="Home Inventory" description="Build a private, room-by-room record of possessions from reviewed photo suggestions."><BeastHomeInventoryWorkspace /></BeastHomeShell>;
}
