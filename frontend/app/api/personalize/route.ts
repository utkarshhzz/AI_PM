import { NextResponse } from "next/server";

const DEFAULT_REMOTE_BACKEND = "https://ai-pm-q8uz.onrender.com";

function getBackendCandidates() {
  const rawCandidates = [
    process.env.BACKEND_API_URL,
    process.env.NEXT_PUBLIC_BACKEND_API_URL,
    process.env.PERSONALIZATION_BACKEND_URL,
    DEFAULT_REMOTE_BACKEND,
    "http://127.0.0.1:8000",
  ];

  const seen = new Set<string>();
  return rawCandidates
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.replace(/\/$/, ""))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

async function tryBackend(url: string, formData: FormData) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    return await fetch(`${url}/api/personalize`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const candidates = getBackendCandidates();
  const failures: string[] = [];

  for (const baseUrl of candidates) {
    try {
      const backendResponse = await tryBackend(baseUrl, formData);
      const data = await backendResponse.json();
      return NextResponse.json(
        {
          ...data,
          backend_used: baseUrl,
        },
        { status: backendResponse.status },
      );
    } catch (error) {
      failures.push(
        `${baseUrl}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return NextResponse.json(
    {
      status: "error",
      error: "Unable to reach personalization backend.",
      detail:
        "Set BACKEND_API_URL in Vercel project settings or keep Render backend awake.",
      backend_attempts: candidates,
      failure_reasons: failures,
    },
    { status: 502 },
  );
}
