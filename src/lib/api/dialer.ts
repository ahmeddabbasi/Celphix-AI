import { authenticatedFetch } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

function joinUrl(base: string, path: string) {
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  const a = base.replace(/\/+$/, "");
  const b = path.replace(/^\/+/, "");
  return `${a}/${b}`;
}

async function postRequest<T>(path: string, body?: unknown): Promise<T> {
  const url = joinUrl(getApiUrl(), path);
  const res = await authenticatedFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as any;
      if (data && typeof data === "object") {
        if (typeof data.detail === "string") {
          message = data.detail;
        } else if (typeof data.message === "string") {
          message = data.message;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export const headlessDialerApi = {
  start: (campaignId: string = "TEST") =>
    postRequest<{ success: boolean; message: string; campaign_id: string; active: boolean }>(
      "/api/dialer/start",
      { campaign_id: campaignId }
    ),

  stop: (campaignId: string = "TEST") =>
    postRequest<{ success: boolean; message: string; campaign_id: string; active: boolean }>(
      "/api/dialer/stop",
      { campaign_id: campaignId }
    ),
};
export default headlessDialerApi;
