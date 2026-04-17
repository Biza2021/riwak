"use client";

import { useEffect, useRef, useState } from "react";

import { fr } from "@/content/fr";
import {
  MAX_VOICE_NOTE_FILE_BYTES,
  MAX_VOICE_NOTE_DATA_URL_LENGTH,
  MAX_VOICE_NOTE_SECONDS,
} from "@/lib/domain";
import {
  Badge,
  FieldHint,
  FieldLabel,
  Notice,
  PrimaryButton,
  SecondaryButton,
} from "./ui";

const MIME_TYPE_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function resolvePreferredMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  for (const candidate of MIME_TYPE_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "";
}

export function VoiceNoteField() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedDurationSec, setRecordedDurationSec] = useState(0);
  const [voiceNoteDataUrl, setVoiceNoteDataUrl] = useState("");
  const [voiceNoteMimeType, setVoiceNoteMimeType] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined";

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }

      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
      }

      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, [previewUrl]);

  function clearTimers() {
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  }

  function stopStream() {
    if (!streamRef.current) {
      return;
    }

    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }

    streamRef.current = null;
  }

  function getElapsedSeconds() {
    if (!recordingStartedAtRef.current) {
      return 0;
    }

    return Math.min(
      MAX_VOICE_NOTE_SECONDS,
      Math.max(
        1,
        Math.ceil((Date.now() - recordingStartedAtRef.current) / 1000),
      ),
    );
  }

  async function startRecording() {
    if (!isSupported || isRecording) {
      return;
    }

    try {
      setError("");

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl("");
      setVoiceNoteDataUrl("");
      setVoiceNoteMimeType("");
      setRecordedDurationSec(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const preferredMimeType = resolvePreferredMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecording(true);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", async () => {
        clearTimers();
        stopStream();
        setIsRecording(false);

        const durationSec = getElapsedSeconds();
        recordingStartedAtRef.current = null;
        setRecordingSeconds(0);
        recorderRef.current = null;

        if (!chunksRef.current.length) {
          setRecordedDurationSec(0);
          return;
        }

        const mimeType = recorder.mimeType || preferredMimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size <= 0 || blob.size > MAX_VOICE_NOTE_FILE_BYTES) {
          setRecordedDurationSec(0);
          setVoiceNoteDataUrl("");
          setVoiceNoteMimeType("");
          setError(fr.order.voiceNoteTooLong);
          return;
        }

        const nextDataUrl = await readBlobAsDataUrl(blob);

        if (!nextDataUrl || nextDataUrl.length > MAX_VOICE_NOTE_DATA_URL_LENGTH) {
          setRecordedDurationSec(0);
          setVoiceNoteDataUrl("");
          setVoiceNoteMimeType("");
          setError(fr.order.voiceNoteTooLong);
          return;
        }

        setPreviewUrl(URL.createObjectURL(blob));
        setVoiceNoteDataUrl(nextDataUrl);
        setVoiceNoteMimeType(mimeType);
        setRecordedDurationSec(durationSec);
      });

      recorder.start();

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds(getElapsedSeconds());
      }, 250);

      recordingTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, MAX_VOICE_NOTE_SECONDS * 1000);
    } catch {
      setError(fr.order.voiceNoteUnsupported);
      stopStream();
      clearTimers();
      recorderRef.current = null;
      recordingStartedAtRef.current = null;
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function deleteVoiceNote() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl("");
    setVoiceNoteDataUrl("");
    setVoiceNoteMimeType("");
    setRecordedDurationSec(0);
    setError("");
  }

  function playPreview() {
    void audioRef.current?.play();
  }

  return (
    <div className="space-y-3 rounded-[1.35rem] border border-[#e1cfb7] bg-[#fcf7ef] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <FieldLabel>{fr.order.voiceNoteLabel}</FieldLabel>
          <FieldHint>{fr.order.voiceNoteHint}</FieldHint>
        </div>
        <Badge tone="neutral">{MAX_VOICE_NOTE_SECONDS}s</Badge>
      </div>

      {!isSupported ? (
        <Notice tone="neutral">{fr.order.voiceNoteUnsupported}</Notice>
      ) : null}

      {error ? <Notice tone="red">{error}</Notice> : null}

      {isRecording ? (
        <Notice tone="gold">
          {fr.order.voiceNoteRecording(recordingSeconds, MAX_VOICE_NOTE_SECONDS)}
        </Notice>
      ) : null}

      {voiceNoteDataUrl && !isRecording ? (
        <Notice tone="green">
          {fr.order.voiceNotePreviewReady} {recordedDurationSec}s
        </Notice>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!isRecording ? (
          <SecondaryButton type="button" onClick={startRecording} disabled={!isSupported}>
            {fr.actions.record}
          </SecondaryButton>
        ) : (
          <PrimaryButton type="button" onClick={stopRecording}>
            {fr.actions.stop}
          </PrimaryButton>
        )}

        {voiceNoteDataUrl ? (
          <SecondaryButton type="button" onClick={playPreview}>
            {fr.actions.listenAgain}
          </SecondaryButton>
        ) : null}

        {voiceNoteDataUrl ? (
          <SecondaryButton type="button" onClick={deleteVoiceNote}>
            {fr.actions.delete}
          </SecondaryButton>
        ) : null}
      </div>

      {voiceNoteDataUrl && previewUrl ? (
        <audio
          ref={audioRef}
          controls
          preload="metadata"
          src={previewUrl}
          className="w-full"
        />
      ) : null}

      <input type="hidden" name="voiceNoteDataUrl" value={voiceNoteDataUrl} />
      <input type="hidden" name="voiceNoteMimeType" value={voiceNoteMimeType} />
      <input
        type="hidden"
        name="voiceNoteDurationSec"
        value={recordedDurationSec ? String(recordedDurationSec) : ""}
      />
    </div>
  );
}
