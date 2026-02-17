import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  Coins,
  ClipboardList,
  LogOut,
  GraduationCap,
  Layers,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
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
  { title: "আমার কোর্স", url: "/student/courses", icon: GraduationCap },
  { title: "লাইভ পরীক্ষা", url: "/student/exams", icon: BookOpen },
  { title: "ফ্ল্যাশ কার্ড", url: "/student/flash-cards", icon: Layers },
  { title: "আমার পরীক্ষা", url: "/student/my-exams", icon: ClipboardList },
  { title: "লিডারবোর্ড", url: "/student/leaderboard", icon: Trophy },
  { title: "কয়েন ওয়ালেট", url: "/student/wallet", icon: Coins },
];

export function StudentSidebar() {
  const { signOut, profile } = useAuth();

  return (
    <Sidebar className="border-r-0">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <BookOpen className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sidebar-foreground">MCQ পরীক্ষা</span>
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
        <div className="mb-2 truncate text-xs text-sidebar-foreground/70">
          {profile?.full_name || "শিক্ষার্থী"}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" /> লগআউট
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
