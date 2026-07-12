import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";

const settingsSections = [
  {
    title: "Theme & Display",
    description:
      "Appearance, density, accessibility, and dashboard display preferences will live here.",
    items: ["Theme mode", "Dashboard density", "Motion preferences"],
  },
  {
    title: "Notification Preferences",
    description:
      "Shared alert channels, quiet hours, and module notification rules are reserved here.",
    items: ["Quiet hours", "Critical alerts", "Module summaries"],
  },
  {
    title: "Module Preferences",
    description:
      "Choose active modules, default landing surfaces, and future workspace ordering.",
    items: ["Money active", "Future modules", "Default workspace"],
  },
];

const accountLinks = [
  {
    label: "Profile",
    href: "/dashboard/profile",
    description: "Manage preferred name and personal context.",
  },
  {
    label: "Privacy",
    href: "https://seangworld.com/privacy.html",
    description: "Review the privacy policy.",
  },
  {
    label: "Terms",
    href: "https://seangworld.com/terms.html",
    description: "Review platform terms.",
  },
];

export default function SettingsPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="beastos" label="Platform Configuration" />
              <h1 className="beast-title">Settings</h1>
              <p className="beast-subtitle">
                App-level preferences for the BeastOS platform. Money-specific
                cashflow and debt settings remain inside BeastMoney.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/profile" className="beast-button">
                Open Profile
              </Link>
              <Link href="/dashboard/money/settings" className="beast-button-secondary">
                Money Settings
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {settingsSections.map((section) => (
            <DashboardCard key={section.title} accent="beastos">
              <SectionHeader title={section.title} description={section.description} />
              <div className="mt-5 grid gap-3">
                {section.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-white">{item}</div>
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold uppercase text-[#7f8da3]">
                        Soon
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <DashboardCard accent="documents">
            <SectionHeader
              eyebrow="Privacy & Security"
              title="Account ownership"
              description="BeastOS settings will gather privacy controls, export paths, deletion controls, and security preferences as platform services mature."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Your data belongs to you.",
                "Export and deletion controls will be centralized here.",
                "Security preferences will remain account-level.",
                "Uploads and profile context stay associated with your account.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-5 text-[#dbe3ef]"
                >
                  {item}
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard accent="money">
            <SectionHeader
              eyebrow="Account"
              title="Management links"
              description="Identity and policy destinations are separated from platform preferences."
            />
            <div className="mt-5 grid gap-3">
              {accountLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#38bdf8]/50 hover:bg-[#202634]"
                >
                  <div className="font-black text-white">{link.label}</div>
                  <p className="mt-1 text-sm leading-5 text-[#9aa7b8]">
                    {link.description}
                  </p>
                </Link>
              ))}
            </div>
          </DashboardCard>
        </section>
      </div>
    </main>
  );
}
