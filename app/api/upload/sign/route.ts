import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    uploadUrl: `${process.env.STORAGE_PUBLIC_URL || "https://example-bucket.s3.amazonaws.com"}/signed-upload-url`,
    method: "PUT"
  });
}
