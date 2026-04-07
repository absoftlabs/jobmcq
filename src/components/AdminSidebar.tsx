import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  FileText,
  FolderTree,
  BadgeDollarSign,
  CreditCard,
  Users,
  Flag,
  LogOut,
  Globe,
  Settings,
} from "lucide-react";
import { Link } from "react-router-dom";
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

const mainMenuItems = [
  { title: "ড্যাশবোর্ড", url: "/admin", icon: LayoutDashboard },
  { title: "প্রশ্ন ব্যাংক", url: "/admin/questions", icon: BookOpen },
  { title: "ক্যাটাগরি", url: "/admin/categories", icon: FolderTree },
  { title: "পরীক্ষা", url: "/admin/exams", icon: FileText },
  { title: "ফ্ল্যাশ কার্ড", url: "/admin/flash-cards", icon: GraduationCap },
  { title: "পরীক্ষার্থী", url: "/admin/users", icon: Users },
  { title: "রিপোর্ট", url: "/admin/reports", icon: Flag },
  { title: "প্যাকেজ মূল্য", url: "/admin/pricing", icon: BadgeDollarSign },
  { title: "পেমেন্ট গেটওয়ে", url: "/admin/payments/bkash", icon: CreditCard },
  { title: "সেটিংস", url: "/admin/settings", icon: Settings },
];

const getInitials = (name?: string | null) => {
  const cleaned = (name || "Admin").trim();
  if (!cleaned) return "A";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

export function AdminSidebar() {
  const { signOut, profile } = useAuth();
  const { settings } = useSiteSettings();
  const displayName = profile?.full_name?.trim() || "Admin";
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
            <GraduationCap className="h-4 w-4" />
          </div>
        )}
        <span className="truncate font-semibold text-sidebar-foreground">{settings.siteTitle}</span>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>মেনু</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
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
              <p className="text-xs text-slate-400">অ্যাডমিন</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full justify-start border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-slate-100"
            >
              <Link to="/">
                <Globe className="mr-2 h-4 w-4" />
                ওয়েবসাইটে যান
              </Link>
            </Button>

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
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
