import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const backendResponse = await fetch(`${BACKEND_URL}/api/personalize`, {
      method: "POST",
      body: formData,
    });

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: "Unable to reach personalization backend.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
