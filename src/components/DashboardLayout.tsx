import { AppSidebar } from "@/components/AppSidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="min-h-screen p-6 pt-16 lg:ml-64 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
