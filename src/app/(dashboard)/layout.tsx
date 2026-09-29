import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <TopBar />
        <main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
