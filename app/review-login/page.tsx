import { ReviewLoginForm } from "./review-login-form";
import { reviewLoginErrorMessage } from "@/lib/supabase/auth-callback";
import {
  reviewLoginSendErrorMessage,
  reviewLoginSendSuccessMessage,
} from "@/lib/supabase/auth-callback-diagnostics";

export const dynamic = "force-dynamic";

type ReviewLoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
}

export default async function ReviewLoginPage({ searchParams }: ReviewLoginPageProps) {
  const params = await searchParams;
  const errorParam = readParam(params, "error");
  const sentParam = readParam(params, "sent");
  const authError = reviewLoginErrorMessage(errorParam);
  const sendErrorMessage = reviewLoginSendErrorMessage(errorParam);
  const sendSuccessMessage = reviewLoginSendSuccessMessage(sentParam);

  return (
    <ReviewLoginForm
      authError={authError}
      sendErrorMessage={sendErrorMessage}
      sendSuccessMessage={sendSuccessMessage}
    />
  );
}
