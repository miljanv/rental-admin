import { AppHeader } from '@/components/layout/app-header';
import { SidebarContent } from '@/components/layout/sidebar-content';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-svh">
      {/* Fixed sidebar on desktop; the mobile drawer lives in the header. */}
      <aside className="bg-sidebar hidden border-r lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </aside>

      <div className="flex min-h-svh flex-col lg:pl-64">
        <AppHeader />
        <main className="flex-1 px-3 py-5 sm:px-4 md:px-5 md:py-6 xl:px-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
