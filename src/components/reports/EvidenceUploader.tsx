"use client";

import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, FileText, Image } from 'lucide-react';
import { uploadEvidence, deleteAttachment, getAttachments } from '@/lib/supabase-data';

interface EvidenceUploaderProps {
  dailyReportId: string;
  taskSubmissionId?: string;
  uploadedBy: number;
  disabled?: boolean;
}

interface AttachmentItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  url?: string;
}

export default function EvidenceUploader({ dailyReportId, taskSubmissionId, uploadedBy, disabled }: EvidenceUploaderProps) {
  const [files, setFiles] = useState<AttachmentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load existing attachments on first render
  async function loadAttachments() {
    if (loaded) return;
    try {
      const existing = await getAttachments({
        daily_report_id: dailyReportId,
        task_submission_id: taskSubmissionId,
      });
      setFiles(existing.map((a: AttachmentItem) => ({
        ...a,
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${a.storage_path}`,
      })));
    } catch (e) { console.error(e); }
    setLoaded(true);
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || disabled) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > 10 * 1024 * 1024) { alert('File quá lớn (max 10MB)'); continue; }
        const result = await uploadEvidence(file, {
          daily_report_id: dailyReportId,
          task_submission_id: taskSubmissionId,
          uploaded_by: uploadedBy,
        });
        setFiles(prev => [...prev, result]);
      }
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(att: AttachmentItem) {
    if (disabled) return;
    try {
      await deleteAttachment(att.id, att.storage_path);
      setFiles(prev => prev.filter(f => f.id !== att.id));
    } catch (e) { console.error(e); }
  }

  const isImage = (type: string) => type?.startsWith('image/');

  return (
    <div onMouseEnter={loadAttachments}>
      {/* Upload buttons */}
      {!disabled && (
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg px-2 py-1.5"
          >
            <Upload size={12} /> Tải ảnh
          </button>
          <button
            onClick={() => {
              if (fileRef.current) {
                fileRef.current.setAttribute('capture', 'environment');
                fileRef.current.click();
                setTimeout(() => fileRef.current?.removeAttribute('capture'), 100);
              }
            }}
            className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded-lg px-2 py-1.5"
          >
            <Camera size={12} /> Chụp ảnh
          </button>
          {uploading && <Loader2 size={14} className="animate-spin text-blue-500 self-center" />}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={e => handleUpload(e.target.files)}
        className="hidden"
      />

      {/* File thumbnails */}
      {files.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {files.map(att => (
            <div key={att.id} className="relative group">
              {isImage(att.file_type) ? (
                <a href={att.url} target="_blank" rel="noopener noreferrer">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={att.url} alt={att.file_name} className="w-full h-full object-cover" />
                  </div>
                </a>
              ) : (
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <FileText size={20} className="text-slate-400" />
                </a>
              )}
              {!disabled && (
                <button
                  onClick={() => handleDelete(att)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
              <p className="text-[8px] text-slate-400 text-center truncate w-16 mt-0.5">{att.file_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
