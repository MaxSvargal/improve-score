import { JudgeBoard } from "@/components/judge-board";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TournamentPage({ params }: Props) {
  const { slug } = await params;

  return <JudgeBoard slug={slug} />;
}
