"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { getUserFileBlob } from "@/lib/data/files";
import type { StoredFile } from "@/lib/data/types";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui";

export function PrivateFileList({ files }: { files: StoredFile[] }) {
  if (!files.length) return <p className="text-sm text-zinc-500">No files attached.</p>;
  return <ul className="space-y-3">{files.map((file) => <PrivateFile key={file.path} file={file} />)}</ul>;
}

function PrivateFile({ file }: { file: StoredFile }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const load = async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const blob = await getUserFileBlob(file.path);
      if (mounted.current) setUrl(URL.createObjectURL(blob));
    } catch (err) {
      if (mounted.current) setError(errorMessage(err, "Could not load this file. Please retry."));
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm text-zinc-300">
          <FileText className="size-4 shrink-0" aria-hidden /><span className="break-all">{file.name}</span>
        </span>
        {url ? <div className="flex gap-4 text-sm font-medium text-brand-400">
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${file.name} in a new tab`}>Open file</a>
          <a href={url} download={file.name} aria-label={`Download ${file.name}`}>Download</a>
        </div> : <Button type="button" variant="secondary" loading={loading} onClick={load} className="w-auto px-3 py-2 text-sm" aria-label={`Load ${file.name}`}>{error ? "Retry file" : "Load file"}</Button>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </li>
  );
}
