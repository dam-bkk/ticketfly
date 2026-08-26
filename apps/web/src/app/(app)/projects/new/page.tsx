import { createProject } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

export const metadata = { title: "New project" };

export default async function NewProject() {
  await requireStaff();
  return (
    <>
      <Topbar crumbs={[{ label: "Projects", href: "/projects" }, { label: "New" }]} />
      <div className="flex-1 overflow-y-auto">
        <form action={createProject} className="mx-auto max-w-xl px-6 py-6 rise">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">New project</h1>
          <p className="text-[13px] text-ink-3">You get an empty grid with three rows. Type into it like a sheet; Enter adds a row, Tab moves across.</p>
          <div className="panel mt-5 space-y-4 p-5">
            <Field label="Name" required><Input name="name" required /></Field>
            <Field label="Description"><Textarea name="description" className="min-h-20" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start"><Input type="date" name="startDate" /></Field>
              <Field label="End"><Input type="date" name="endDate" /></Field>
            </div>
          </div>
          <div className="mt-5 flex justify-end"><Button type="submit" variant="primary" size="lg">Create project</Button></div>
        </form>
      </div>
    </>
  );
}
