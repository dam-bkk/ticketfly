import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requirePrincipal } from "@/lib/auth";

export const metadata = { title: "Guides" };

const GUIDES = [
  { t: "Set up your new laptop in 10 minutes", d: "Sign in, Intune enrolment, OneDrive, Teams and the VPN — in the right order.", tag: "Getting started", min: 10 },
  { t: "Connect to the VPN from home", d: "Cisco Secure Client on Windows and Mac, and what to do when the MFA prompt does not arrive.", tag: "Network", min: 3 },
  { t: "Book a meeting room from Outlook", d: "Room finder, recurring bookings and the screens in HK and KL.", tag: "Collaboration", min: 2 },
  { t: "Recognise a phishing email", d: "Five tells, and the one-click report button in Outlook.", tag: "Security", min: 4 },
  { t: "Your first week: accounts and access", d: "What you already have, what to ask for, and who approves it.", tag: "Getting started", min: 5 },
  { t: "Travelling with company devices", d: "Roaming, hotel Wi-Fi, and what to do if a device is lost.", tag: "Mobile", min: 4 },
];

export default async function Help() {
  await requirePrincipal();
  return (
    <div className="pt-10 rise">
      <h1 className="text-[26px] font-semibold tracking-[-0.015em]">Guides</h1>
      <p className="text-[14px] text-ink-3">Short, written for people who are not in IT. If a guide does not solve it, the request button is at the end of each one.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g) => (
          <Link key={g.t} href="#" className="group flex flex-col rounded-2xl bg-surface p-5 transition-all hairline hover:-translate-y-0.5 hover:shadow-2">
            <span className="eyebrow">{g.tag} · {g.min} min</span>
            <span className="mt-2 text-[15px] font-semibold leading-snug tracking-[-0.01em]">{g.t}</span>
            <span className="mt-1 flex-1 text-[12.5px] leading-relaxed text-ink-3">{g.d}</span>
            <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 group-hover:text-accent-ink">
              Read <ArrowRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
