import { useOrg } from "@/contexts/OrgContext";
import PlatformDashboard from "@/pages/PlatformDashboard";
import OrgDashboard from "@/pages/OrgDashboard";

export default function Index() {
  const { isPlatformAdmin } = useOrg();

  if (isPlatformAdmin) {
    return <PlatformDashboard />;
  }

  return <OrgDashboard />;
}
