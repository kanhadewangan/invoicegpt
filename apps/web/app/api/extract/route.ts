import { extractInvoice, isSupportedImageType } from "@repo/ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/server/errors";
import { getAI } from "@/lib/server/services";

export const maxDuration = 60;

// ~4 MB image once base64-encoded, under Vercel's 4.5 MB request body limit.
const MAX_IMAGE_BASE64_LENGTH = 4_000_000;

const BodySchema = z
  .object({
    text: z.string().max(20_000, "That message is too long (20,000 characters max).").optional(),
    image: z
      .object({
        data: z.string().max(MAX_IMAGE_BASE64_LENGTH, "That image is too large (about 3 MB max)."),
        mediaType: z.string().refine(isSupportedImageType, "Use a PNG, JPEG, WebP or GIF image."),
      })
      .optional(),
  })
  .refine((body) => body.text?.trim() || body.image, "Paste a message or add a screenshot.");

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const image = body.image && isSupportedImageType(body.image.mediaType)
      ? { data: body.image.data, mediaType: body.image.mediaType }
      : undefined;
    const extracted = await extractInvoice(getAI(), { text: body.text, image });
    return NextResponse.json(extracted);
  } catch (error) {
    return errorResponse(error);
  }
}
