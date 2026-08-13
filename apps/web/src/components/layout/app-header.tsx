import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Separator } from '@/components/ui/separator';

export function AppHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-sm md:px-6">
      <MobileSidebar />
      <Separator orientation="vertical" className="lg:hidden data-[orientation=vertical]:h-5" />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
