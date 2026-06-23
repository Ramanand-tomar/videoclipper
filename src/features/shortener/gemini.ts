import type { TranscriptWord } from "@/lib/transcript";
import { normalizeGeminiRefinement } from "./normalize";
import type {
  GeminiRefinement,
  GeminiRefinementOptions,
  RefinementMode,
} from "./types";

export const requestGeminiRefinement = async (
  words: TranscriptWord[],
  shorteningMode: RefinementMode,
  options?: GeminiRefinementOptions
): Promise<{ refinement: GeminiRefinement; fileUploadUsed: boolean; rawText: string }> => {
  const geminiProvider =
    process.env.NEXT_PUBLIC_GEMINI_PROVIDER?.trim().toLowerCase() ||
    "openrouter";
  const defaultClientModel =
    geminiProvider === "openrouter"
      ? "google/gemini-2.0-flash-exp"
      : "models/gemini-2.5-flash-lite";
  const model =
    process.env.NEXT_PUBLIC_GEMINI_MODEL?.trim() || defaultClientModel;

  const proxyBase =
    process.env.NEXT_PUBLIC_GEMINI_PROXY_URL?.replace(/\/$/, "") ?? "";
  const payload: Record<string, unknown> = {
    model,
    words,
    shorteningMode,
    provider: geminiProvider,
  };
  if (options?.variantCount && options.variantCount > 1) {
    payload.variantCount = options.variantCount;
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(
        `${proxyBase ? proxyBase : ""}/api/gemini-refine`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let isRetryable = false;
        try {
          const errObj = JSON.parse(errorText);
          const code = errObj.error?.code || errObj.code;
          const status = errObj.error?.status || errObj.status;
          const msg = errObj.error?.message || errObj.message || "";
          if (
            code === 503 ||
            status === "UNAVAILABLE" ||
            msg.toLowerCase().includes("demand") ||
            msg.toLowerCase().includes("limit")
          ) {
            isRetryable = true;
          }
        } catch (_) {
          if (
            errorText.toLowerCase().includes("demand") ||
            errorText.toLowerCase().includes("limit") ||
            errorText.toLowerCase().includes("unavailable")
          ) {
            isRetryable = true;
          }
        }

        if (isRetryable && attempt < maxRetries - 1) {
          attempt++;
          const delay = Math.pow(2, attempt) * 1500;
          console.warn(
            `Gemini API experiencing high demand (503/Unavailable). Retrying attempt ${attempt} in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(
          errorText || "Gemini transcription refinement request failed."
        );
      }

      const fileUploadUsed =
        response.headers.get("x-gemini-file-upload") === "true";

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const aggregatedText = Array.isArray(candidate?.content?.parts)
        ? candidate.content.parts
            .map((part: { text?: string }) => part?.text ?? "")
            .join("")
            .trim()
        : candidate?.output_text?.trim?.() ?? "";

      if (!aggregatedText) {
        throw new Error("Gemini response did not include any text output.");
      }

      let parsed: GeminiRefinement;
      try {
        const cleanText = aggregatedText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        parsed = JSON.parse(cleanText);
      } catch (error) {
        console.error("Gemini raw response", aggregatedText);
        throw new Error("Gemini response was not valid JSON.");
      }

      return {
        refinement: normalizeGeminiRefinement(parsed, words),
        fileUploadUsed,
        rawText: aggregatedText,
      };
    } catch (err) {
      if (attempt < maxRetries - 1) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1500;
        console.warn(
          `Error contacting Gemini API: ${err}. Retrying attempt ${attempt} in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Failed to refine transcript after maximum retries.");
};
