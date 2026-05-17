import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import type { UploadResult } from "@uppy/core";
import DashboardModal from "@uppy/react/dashboard-modal";
import XHRUpload from "@uppy/xhr-upload";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import { Button } from "@/components/ui/button";

interface ImageMinDimensions {
  width: number;
  height: number;
}

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
  /**
   * Optional minimum width/height for image uploads. When set, every image file
   * added is measured client-side; if it is smaller than the recommendation, a
   * non-blocking warning is sent to `onValidationWarning` (the upload still
   * proceeds). Non-image files are ignored.
   */
  imageMinDimensions?: ImageMinDimensions;
  /**
   * Receives a human-readable warning string when an image fails the
   * `imageMinDimensions` check. Typically wired to a toast.
   */
  onValidationWarning?: (message: string) => void;
}

/**
 * Read intrinsic image dimensions from a File without uploading it.
 * Resolves to null for non-image files or when decoding fails.
 */
function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * A file upload component that renders as a button and provides a modal
 * interface for file management.
 *
 * Files are uploaded via a single POST to /api/uploads/upload (raw binary).
 * The server streams them directly to GCS and returns { objectPath }.
 * Each successful file in onComplete will have uploadURL set to the
 * canonical /objects/... path so consumers can use it immediately without
 * a separate finalize step.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onComplete,
  buttonClassName,
  children,
  imageMinDimensions,
  onValidationWarning,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);

  const onCompleteRef = useRef(onComplete);
  const onValidationWarningRef = useRef(onValidationWarning);
  const imageMinDimensionsRef = useRef(imageMinDimensions);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onValidationWarningRef.current = onValidationWarning; }, [onValidationWarning]);
  useEffect(() => { imageMinDimensionsRef.current = imageMinDimensions; }, [imageMinDimensions]);

  const [uppy] = useState(() => {
    const instance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
    })
      .use(XHRUpload, {
        endpoint: "/api/uploads/upload",
        method: "POST",
        formData: false,
        withCredentials: true,
        headers: (file) => ({
          "Content-Type": file.type || "application/octet-stream",
        }),
      })
      .on("complete", (result) => {
        const enriched = {
          ...result,
          successful: result.successful?.map((f) => ({
            ...f,
            // Expose the server-returned objectPath as uploadURL so consumers
            // can use result.successful[0].uploadURL directly as the image path.
            uploadURL:
              (f.response?.body as { objectPath?: string })?.objectPath ??
              f.uploadURL,
          })),
        } as typeof result;

        onCompleteRef.current?.(enriched);
      });

    instance.on("file-added", (file) => {
      const dims = imageMinDimensionsRef.current;
      if (!dims) return;
      const data = file.data as File | Blob;
      if (typeof File === "undefined" || !(data instanceof File)) return;
      void readImageDimensions(data).then((fileDims) => {
        if (!fileDims) return;
        if (fileDims.width < dims.width || fileDims.height < dims.height) {
          const msg =
            `"${file.name}" is ${fileDims.width}×${fileDims.height}px — recommended ` +
            `at least ${dims.width}×${dims.height}px ` +
            `for a sharp display. The image will still upload.`;
          onValidationWarningRef.current?.(msg);
        }
      });
    });

    return instance;
  });

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
