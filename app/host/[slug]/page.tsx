import Link from "next/link";
import { notFound } from "next/navigation";

import { HostMonitor } from "@/components/host-monitor";
import { LoginForm } from "@/components/login-form";
import { isHostAuthed } from "@/lib/auth";
import { getEventSnapshot } from "@/lib/store";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function HostEventPage({ params }: Props) {
  const { slug } = await params;
  const authed = await isHostAuthed();

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <LoginForm />
      </div>
    );
  }

  const snapshot = await getEventSnapshot(slug);
  if (!snapshot) {
    notFound();
  }

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Link href="/host" className="text-sm text-cyan-200 transition hover:text-cyan-100">
          Back to events
        </Link>
        <HostMonitor slug={slug} initialSnapshot={snapshot} />
      </div>
    </div>
  );
}
