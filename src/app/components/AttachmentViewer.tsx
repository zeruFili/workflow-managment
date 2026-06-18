import React, { useState, useCallback } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001';
const API_BASE_ORIGIN = API_BASE_URL.replace(/\/+$/, '');

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `${API_BASE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export interface AttachmentItem {
  url: string;
  name?: string;
}

function getFileExtension(url: string): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.split('.').pop()?.toLowerCase() || '';
    if (ext && ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) return ext;
  } catch {}
  return '';
}

function getFileTypeLabel(url: string): string {
  const ext = getFileExtension(url);
  if (!ext) return 'File';
  return ext.toUpperCase();
}

function getFileName(url: string, index: number): string {
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0) return decodeURIComponent(segments[segments.length - 1]);
  } catch {}
  const ext = getFileExtension(url);
  return `attachment-${index + 1}${ext ? '.' + ext : ''}`;
}

function normalizeAttachments(attachments: (string | AttachmentItem)[]): AttachmentItem[] {
  return attachments.map((a, i) => {
    if (typeof a === 'string') {
      return { url: resolveUrl(a), name: getFileName(a, i) };
    }
    return { url: resolveUrl(a.url), name: a.name || getFileName(a.url, i) };
  });
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function ImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const imgRef = React.useRef<HTMLImageElement>(null);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-[95vw] max-h-[95vh]">
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          style={{ transform: `scale(${zoom})` }}
          className="max-w-full max-h-[90vh] object-contain rounded transition-transform"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={() => imgRef.current?.requestFullscreen?.()}
            className="px-3 py-2 bg-white/80 rounded text-sm font-medium hover:bg-white"
          >
            Fullscreen
          </button>
          <button onClick={onClose} className="px-3 py-2 bg-white/80 rounded text-sm font-medium hover:bg-white">
            Close
          </button>
        </div>
        <div className="absolute left-2 bottom-2 flex items-center gap-2 bg-white/90 rounded-lg p-2 shadow">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
            className="w-7 h-7 flex items-center justify-center border rounded text-sm font-medium hover:bg-gray-100"
          >
            -
          </button>
          <span className="text-sm px-1 min-w-[3ch] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
            className="w-7 h-7 flex items-center justify-center border rounded text-sm font-medium hover:bg-gray-100"
          >
            +
          </button>
          <button onClick={() => setZoom(1)} className="px-2 py-1 border rounded text-sm font-medium hover:bg-gray-100">
            Reset
          </button>
        </div>
        {isExternalUrl(src) && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 left-2 px-3 py-2 bg-white/80 rounded text-sm font-medium hover:bg-white flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </a>
        )}
      </div>
    </div>
  );
}

function FileCard({ item }: { item: AttachmentItem }) {
  const ext = getFileExtension(item.url);
  const isPdf = ext === 'pdf';

  if (isPdf) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-sm group mr-2 mb-2"
      >
        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-red-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{item.name || 'PDF Document'}</p>
          <p className="text-xs text-gray-400">PDF · Click to open</p>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
      </a>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      download={item.name}
      className="inline-flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-sm group mr-2 mb-2"
    >
      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
        <Download className="w-5 h-5 text-blue-600" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{item.name || 'File'}</p>
        <p className="text-xs text-gray-400">{getFileTypeLabel(item.url)} · Download</p>
      </div>
      <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
    </a>
  );
}

function ImageThumbnail({
  item,
  compact,
  onExpand,
}: {
  item: AttachmentItem;
  compact: boolean;
  onExpand: (url: string) => void;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  const handleError = useCallback(() => {
    setLoadFailed(true);
  }, []);

  if (loadFailed) {
    return <FileCard item={item} />;
  }

  const thumbnailHeight = compact ? 'h-20' : 'h-24';

  return (
    <div className="inline-block mr-2 mb-2">
      <img
        src={item.url}
        alt={item.name || 'attachment'}
        className={`${thumbnailHeight} w-auto rounded-lg border object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition-shadow`}
        onClick={() => onExpand(item.url)}
        onError={handleError}
      />
    </div>
  );
}

export default function AttachmentViewer({
  attachments,
  compact = false,
}: {
  attachments: (string | AttachmentItem)[];
  compact?: boolean;
}) {
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const items = normalizeAttachments(attachments);

  return (
    <>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const ext = getFileExtension(item.url);

          if (ext === 'pdf') {
            return <FileCard key={idx} item={item} />;
          }

          return (
            <ImageThumbnail
              key={idx}
              item={item}
              compact={compact}
              onExpand={setViewerSrc}
            />
          );
        })}
      </div>

      {viewerSrc && (
        <ImageViewer
          src={viewerSrc}
          alt="attachment preview"
          onClose={() => setViewerSrc(null)}
        />
      )}
    </>
  );
}
