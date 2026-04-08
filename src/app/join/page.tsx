import { Header } from "@/components/landing/header";
import { SignupSection } from "@/components/landing/signup-section";
import { Footer } from "@/components/landing/footer";
import { query } from "@/lib/db";

interface GuestRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_clean: string | null;
  age_range: string | null;
  solo_or_couple: string | null;
  dietary_notes: string | null;
  available_days: string[] | null;
}

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
    const guests = await query<GuestRow>(
      `SELECT id, first_name, last_name, email, phone_clean, age_range, solo_or_couple, dietary_notes, available_days
       FROM guests
       WHERE resume_token = $1`,
      [token]
    );

    if (!guests || guests.length === 0) {
      return null;
    }

    const guest = guests[0];
    return {
      id: guest.id,
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      phone: guest.phone_clean,
      age_range: guest.age_range,
      solo_or_couple: guest.solo_or_couple,
      dietary_notes: guest.dietary_notes,
      available_days: guest.available_days,
    };
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
