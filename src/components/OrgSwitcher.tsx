import { useNavigate } from "react-router-dom";
import { useOrg } from "@/contexts/OrgContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";

export function OrgSwitcher() {
  const { currentOrg, orgs, isPlatformAdmin, switchOrg } = useOrg();
  const navigate = useNavigate();

  if (!currentOrg || isPlatformAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-3 text-left font-normal"
        >
          <Building2 className="h-4 w-4 shrink-0 text-sidebar-primary" />
          <span className="flex-1 truncate text-sm font-medium">
            {currentOrg.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {orgs.map((m) => (
          <DropdownMenuItem
            key={m.org_id}
            onClick={() => switchOrg(m.org_id)}
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            <span className="flex-1 truncate">{m.organization.name}</span>
            {currentOrg && m.org_id === currentOrg.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/create-org")} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
