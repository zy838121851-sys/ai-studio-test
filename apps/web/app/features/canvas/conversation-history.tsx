import type { ConversationDto } from "@ai-studio/contracts";

export function CanvasConversationHistory({
  conversation
}: {
  conversation: ConversationDto | undefined;
}) {
  if (!conversation?.messages?.length) return null;
  return (
    <section className="canvas-conversation-history" aria-label="Conversation history">
      {conversation.messages.map((message) => (
        <article
          key={message.id}
          className={`canvas-conversation-history__message is-${message.role}`}
        >
          <p>{message.content}</p>
          {message.role === "assistant" ? (
            <span data-job-status={message.status}>
              {jobStatus(message.status, message.job?.error?.message)}
            </span>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function jobStatus(status: string, errorMessage: string | undefined) {
  if (status === "queued") return "Queued";
  if (status === "running") return "Generating";
  if (status === "succeeded") return "Completed";
  if (status === "failed") return errorMessage ?? "Generation failed";
  if (status === "cancelled") return "Cancelled";
  return "Completed";
}
