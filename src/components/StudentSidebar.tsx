import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Coins,
  CreditCard,
  ClipboardList,
  LogOut,
  Layers,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "ড্যাশবোর্ড", url: "/student", icon: LayoutDashboard },
  { title: "লাইভ পরীক্ষা", url: "/student/exams", icon: BookOpen },
  { title: "ফ্ল্যাশ কার্ড", url: "/student/flash-cards", icon: Layers },
  { title: "আমার পরীক্ষা", url: "/student/my-exams", icon: ClipboardList },
  { title: "লিডারবোর্ড", url: "/student/leaderboard", icon: Trophy },
  { title: "কয়েন ওয়ালেট", url: "/student/wallet", icon: Coins },
  { title: "সাবস্ক্রিপশন", url: "/student/subscription", icon: CreditCard },
];

const getInitials = (name?: string | null) => {
  const cleaned = (name || "শিক্ষার্থী").trim();
  if (!cleaned) return "শি";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

export function StudentSidebar() {
  const { signOut, profile } = useAuth();
  const { settings } = useSiteSettings();
  const displayName = profile?.full_name?.trim() || "শিক্ষার্থী";
  const initials = getInitials(displayName);

  return (
    <Sidebar className="border-r-0">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt={settings.siteTitle}
            className="h-8 w-8 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
        )}
        <span className="truncate font-semibold text-sidebar-foreground">{settings.siteTitle}</span>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>মেনু</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/student"}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-100">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">{displayName}</p>
              <p className="text-xs text-slate-400">শিক্ষার্থী</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-200 hover:bg-slate-800 hover:text-slate-100"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            লগআউট
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
