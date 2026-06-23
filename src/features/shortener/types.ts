import type {
  ElevenLabsTranscriptResponse,
  OpenAITranscriptResponse,
  TranscriptWord,
} from "@/lib/transcript";

export type TranscriptionResult = {
  transcript: string;
  rawResponse: ElevenLabsTranscriptResponse | OpenAITranscriptResponse;
};

export type RefinementMode =
  | "disfluency"
  | "thirty_seconds"
  | "sixty_seconds"
  | "summary";
export type SpeakerTemplateId =
  | "none"
  | "stacked"
  | "sidecar"
  | "overlay"
  | "solo"
  | "multi"
  | "split-gameplay";
export type SpeakerTemplateOption = {
  id: SpeakerTemplateId;
  label: string;
  description?: string | null;
};
export type SpeechToTextProvider =
  | "elevenlabs"
  | "openai-whisper"
  | "openai-gpt4o";

export type GeminiEmoji = {
  emoji: string;
  word_index: number;
  duration: number;
};

export type GeminiConceptRaw = {
  id?: string | null;
  title?: string | null;
  name?: string | null;
  label?: string | null;
  description?: string | null;
  summary?: string | null;
  concept_title?: string | null;
  concept_summary?: string | null;
  hook?: string | null;
  notes?: string | null;
  estimated_duration_seconds?: number | null;
  trimmed_words?: TranscriptWord[];
  youtube_title?: string | null;
  youtube_description?: string | null;
  emojis?: GeminiEmoji[] | null;
};

export type GeminiRefinementPayload = {
  hook?: string | null;
  trimmed_words?: TranscriptWord[];
  notes?: string | null;
  estimated_duration_seconds?: number | null;
  default_concept_id?: string | null;
  concepts?: GeminiConceptRaw[];
  youtube_title?: string | null;
  youtube_description?: string | null;
  emojis?: GeminiEmoji[] | null;
};

export type GeminiConceptChoice = {
  id: string;
  title: string;
  description: string | null;
  hook: string | null;
  trimmed_words: TranscriptWord[];
  notes: string | null;
  estimated_duration_seconds: number | null;
  youtube_title: string | null;
  youtube_description: string | null;
  emojis: GeminiEmoji[];
};

export type GeminiRefinement = {
  hook: string | null;
  trimmed_words: TranscriptWord[];
  notes: string | null;
  estimated_duration_seconds: number | null;
  concepts: GeminiConceptChoice[];
  default_concept_id: string | null;
  youtube_title: string | null;
  youtube_description: string | null;
  emojis: GeminiEmoji[];
};

export type GeminiRefinementOptions = {
  variantCount?: number;
};

export type TimeRange = {
  start: number;
  end: number;
};

export type RangeMapping = {
  start: number;
  end: number;
  timelineStart: number;
};

export type ProcessingStepId = "audio" | "transcript" | "analysis" | "preload";
export type ProcessingStatus = "idle" | "active" | "complete" | "error";

export type CaptionSegment = {
  text: string;
  start: number;
  duration: number;
};

export type SpeakerSnippet = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export type FaceBounds = {
  cx: number;
  cy: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

export type SpeakerFaceThumbnail = {
  id: string;
  speakerId: string;
  speakerLabel: string;
  start: number;
  end: number;
  slotIndex: number;
  bounds: FaceBounds;
  src: string;
};

export type SpeakerPreview = {
  id: string;
  label: string;
  thumbnails: SpeakerFaceThumbnail[];
};
