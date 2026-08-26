import { Topbar } from "@/components/shell/topbar";
import { SettingsNav } from "./nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar crumbs={[{ label: "Admin" }]} />
      <div className="flex min-h-0 flex-1">
        <SettingsNav />
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1040px] px-8 py-7 rise">{children}</div>
        </div>
      </div>
    </>
  );
}
