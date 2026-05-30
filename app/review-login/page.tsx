import { ReviewLoginForm } from "./review-login-form";
import { reviewLoginErrorMessage } from "@/lib/supabase/auth-callback";

export const dynamic = "force-dynamic";

type ReviewLoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewLoginPage({ searchParams }: ReviewLoginPageProps) {
  const params = await searchParams;
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;
  const authError = reviewLoginErrorMessage(errorParam);

  return <ReviewLoginForm authError={authError} />;
}
