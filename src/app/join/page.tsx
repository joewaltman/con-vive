import { Header } from "@/components/landing/header";
import { SignupSection } from "@/components/landing/signup-section";
import { Footer } from "@/components/landing/footer";

interface ResumeData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  age_range: string | null;
  solo_or_couple: string | null;
  dietary_notes: string | null;
  available_days: string[] | null;
}

async function fetchGuestByToken(token: string): Promise<ResumeData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/guest?token=${token}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch {
    return null;
  }
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const params = await searchParams;
  const resumeToken = params.resume;

  let resumeData: ResumeData | null = null;
  if (resumeToken) {
    resumeData = await fetchGuestByToken(resumeToken);
  }

  return (
    <main>
      <Header />
      <SignupSection resumeData={resumeData} />
      <Footer />
    </main>
  );
}
