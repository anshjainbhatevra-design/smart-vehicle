import webpush from "web-push";

// Configure VAPID once at module load time.
// These env vars are checked at build time by TypeScript's non-null assertion.
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type SubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Send a Web Push notification to a single subscription endpoint.
 *
 * Returns true if the notification was delivered.
 * Returns false if the subscription is expired/invalid (caller should delete it).
 * Throws for unexpected errors.
 */
export async function sendPushNotification(
  subscription: SubscriptionRecord,
  payload: PushPayload
): Promise<boolean> {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/owner/dashboard",
      })
    );
    return true;
  } catch (error: unknown) {
    // 404 or 410 means the subscription is no longer valid.
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      (error.statusCode === 404 || error.statusCode === 410)
    ) {
      return false;
    }
    throw error;
  }
}
