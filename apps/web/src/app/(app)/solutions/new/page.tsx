import { createArticle } from "@/app/module-actions";
import { requireStaff } from "@/lib/auth";
import { listFolders } from "@/lib/kb";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export const metadata = { title: "New article" };

export default async function NewArticle() {
  await requireStaff();
  const folders = await listFolders();
  return (
    <>
      <Topbar crumbs={[{ label: "Solutions", href: "/solutions" }, { label: "New article" }]} />
      <div className="flex-1 overflow-y-auto">
        <form action={createArticle} className="mx-auto max-w-3xl px-6 py-6 rise">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">New article</h1>
          <p className="text-[13px] text-ink-3">Write for the person who is stuck, not for IT. Short steps, one screenshot per step when you add them.</p>
          <div className="panel mt-5 space-y-4 p-5">
            <Field label="Title" required><Input name="title" required placeholder="How to … / Why does … / Fix for …" /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Folder" required>
                <Select name="folderId" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {folders.map(([cat, fs]) => (
                    <optgroup key={cat} label={cat}>
                      {fs.map((f) => <option key={f.f.id} value={f.f.id}>{f.f.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option></Select>
              </Field>
              <Field label="Review due"><Input type="date" name="reviewDue" defaultValue="2027-02-28" /></Field>
            </div>
            <Field label="Body (Markdown)" required><Textarea name="body" required className="min-h-72 font-mono text-[12.5px]" placeholder={"## Symptoms\n\n## Steps\n1. \n2. \n\n## If it still fails\nRaise a ticket and mention this article."} /></Field>
          </div>
          <div className="mt-5 flex justify-end"><Button type="submit" variant="primary" size="lg">Save article</Button></div>
        </form>
      </div>
    </>
  );
}
