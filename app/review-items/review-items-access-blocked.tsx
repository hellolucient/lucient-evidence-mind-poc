import { getReviewQueueAccessBlockedMessage } from "@/lib/review/review-queue-access-blocked-copy";

type ReviewItemsAccessBlockedProps = {
  showLoginLink?: boolean;
};

export function ReviewItemsAccessBlocked({
  showLoginLink = false,
}: ReviewItemsAccessBlockedProps) {
  const message = getReviewQueueAccessBlockedMessage(showLoginLink);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "640px" }}>
      <h1 style={{ marginTop: 0 }}>{message.title}</h1>
      <p style={{ color: "#444" }}>{message.intro}</p>
      {message.loginPath ? (
        <p style={{ color: "#444" }}>
          {message.loginPrompt}{" "}
          <a href={message.loginPath}>{message.loginPath}</a>.
        </p>
      ) : (
        <p style={{ color: "#444" }}>{message.fallbackPrompt}</p>
      )}
    </main>
  );
}
