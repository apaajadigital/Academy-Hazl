"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X } from "lucide-react";
import { getValidToken } from "@/lib/auth/token";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  required?: boolean;
  containerClassName?: string;
  accept?: string;
  uploadEndpoint?: string;
};

export function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = "https://... atau upload dari perangkat",
  required,
  containerClassName,
  accept = "image/*",
  uploadEndpoint = "/api/upload/image",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const token = await getValidToken();
      if (!token) { setError("Sesi habis, silakan login ulang."); return; }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(uploadEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        onChange(json.data.url);
      } else {
        setError(json.error?.message ?? "Upload gagal.");
      }
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName ?? ""}`}>
      <label className="text-sm font-medium text-text-primary">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setError(""); }}
          placeholder={placeholder}
          required={required}
          className="min-w-0 flex-1 rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-purple focus:outline-none"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Mengupload..." : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {value && (value.startsWith("/uploads/") || value.startsWith("http")) && (
        <div className="relative mt-1 flex items-center gap-2">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border-default bg-surface-sunken">
            <Image
              src={value}
              alt="Preview"
              fill
              sizes="64px"
              className="object-cover"
              onError={() => {}}
            />
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
            title="Hapus gambar"
          >
            <X size={12} />
          </button>
          <span className="min-w-0 truncate text-xs text-text-secondary">{value.split("/").pop()}</span>
        </div>
      )}
    </div>
  );
}
