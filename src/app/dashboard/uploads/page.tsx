import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";
import {
  PlatformServiceHero,
  PrivacyMessageCard,
} from "@/app/dashboard/platformServices";

const uploadCategories: {
  label: string;
  module: ModuleKey;
  description: string;
}[] = [
  {
    label: "Money",
    module: "money",
    description: "Statements, receipts, bills, tax files, and payoff documents.",
  },
  {
    label: "Learning",
    module: "learning",
    description: "Notes, PDFs, course files, summaries, and references.",
  },
];

const supportedFileTypes = [
  "PDF",
  "Images",
  "CSV",
  "Spreadsheets",
  "Documents",
  "Text",
];

const recentUploads = [
  {
    title: "Money statement",
    detail: "Reserved for account-associated financial uploads.",
    module: "money" as ModuleKey,
  },
  {
    title: "Learning notes",
    detail: "Reserved for course notes and study references.",
    module: "learning" as ModuleKey,
  },
];

export default function UploadsPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="documents"
          eyebrow="Shared Service"
          title="Upload Center"
          description="A protected place for future Money and Learning files. Members will see this when upload handling is ready."
        />

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardCard accent="documents">
            <SectionHeader
              eyebrow="Upload"
              title="Add files to BeastOS"
              description="File upload is not part of the current Member navigation."
            />
            <div className="mt-6 rounded-2xl border border-dashed border-[#94a3b8]/50 bg-[#0f1419] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#94a3b8]/40 bg-slate-300/10 text-2xl font-black text-slate-100">
                UP
              </div>
              <h2 className="mt-5 text-2xl font-black text-white">
                Upload foundation ready
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#c7cfdb]">
                File picking, processing, and storage are not exposed to Members
                yet. Current documents should stay in the product workspace that
                needs them.
              </p>
              <div className="mt-5 text-xs font-bold uppercase text-[#7f8da3]">
                Supported file types
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {supportedFileTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-[#2a3242] bg-[#111827] px-3 py-1 text-xs font-bold text-[#dbe3ef]"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </DashboardCard>

          <PrivacyMessageCard />
        </section>

        <DashboardCard accent="beastos">
          <SectionHeader
            eyebrow="Categories"
            title="Module destinations"
            description="Money and Learning are the current destinations planned for this surface."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {uploadCategories.map((category) => {
              const accent = moduleAccents[category.module];

              return (
                <div
                  key={category.label}
                  className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-white">
                        {category.label}
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">
                        {category.description}
                      </p>
                    </div>
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ background: accent.color }}
                    />
                  </div>
                  <div className="mt-4">
                    <ModuleBadge
                      module={category.module}
                      label="Planned"
                      comingSoon
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardCard>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <DashboardCard accent="blue">
            <SectionHeader
              eyebrow="Storage"
              title="Storage summary"
              description="Storage accounting will appear after Member upload handling is approved."
            />
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Used
                </div>
                <div className="mt-2 text-3xl font-black text-white">0 MB</div>
              </div>
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Account Scope
                </div>
                <div className="mt-2 text-sm font-semibold leading-5 text-[#dbe3ef]">
                  Files will remain tied to your signed-in BeastOS account.
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard accent="documents">
            <SectionHeader
              eyebrow="Recent Uploads"
              title="Document activity"
              description="Uploaded files will appear here after the Member workflow is enabled."
            />
            <div className="mt-5 grid gap-3">
              {recentUploads.map((upload) => (
                <div
                  key={upload.title}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-black text-white">{upload.title}</div>
                    <ModuleBadge module={upload.module} label="Reserved" comingSoon />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">
                    {upload.detail}
                  </p>
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>
      </div>
    </main>
  );
}
