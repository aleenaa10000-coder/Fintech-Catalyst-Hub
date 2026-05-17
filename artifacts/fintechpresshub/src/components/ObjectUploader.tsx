import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import type { UppyFile, UploadResult } from "@uppy/core";
import DashboardModal from "@uppy/react/dashboard-modal";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import { Button } from "@/components/ui/button";

interface ImageMinDimensions {
  width: number;
  height: number;
}

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  /**
   * Function to get upload parameters for each file.
   * IMPORTANT: This receives the file object - use file.name, file.size, file.type
   * to request per-file presigned URLs from your backend.
   */
  onGetUploadParameters: (
    file: UppyFile<Record<string, unknown>, Record<string, unknown>>
  ) => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
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
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 *
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 *
 * The component uses Uppy v5 under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 *
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters for each file.
 *   Receives the UppyFile object with file.name, file.size, file.type properties.
 *   Use these to request per-file presigned URLs from your backend. Returns method,
 *   url, and optional headers for the upload request.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  imageMinDimensions,
  onValidationWarning,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);

  // Keep stable refs to the latest callbacks so the Uppy instance (created
  // once in useState) always calls the most-recent prop versions.
  const onGetUploadParametersRef = useRef(onGetUploadParameters);
  const onCompleteRef = useRef(onComplete);
  const onValidationWarningRef = useRef(onValidationWarning);
  const imageMinDimensionsRef = useRef(imageMinDimensions);

  useEffect(() => { onGetUploadParametersRef.current = onGetUploadParameters; }, [onGetUploadParameters]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onValidationWarningRef.current = onValidationWarning; }, [onValidationWarning]);
  useEffect(() => { imageMinDimensionsRef.current = imageMinDimensions; }, [imageMinDimensions]);

  // Map from Uppy file ID → presigned PUT URL, populated when
  // getUploadParameters is called. GCS presigned PUT responses do not include
  // a Location header, so Uppy cannot determine the upload URL on its own.
  // We store it here and inject it back into the complete result ourselves.
  const uploadURLByFileId = useRef<Map<string, string>>(new Map());

  const [uppy] = useState(() => {
    const instance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          const params = await onGetUploadParametersRef.current(file);
          // Store the presigned URL so we can supply it in onComplete.
          uploadURLByFileId.current.set(file.id, params.url);
          return params;
        },
      })
      .on("complete", (result) => {
        // Uppy's AWS-S3 plugin sets uploadURL from the PUT response's
        // Location header. GCS signed URLs never return that header, so
        // uploadURL is undefined. We inject the presigned URL we stored
        // during getUploadParameters so consumers can use it for finalization.
        const enriched = {
          ...result,
          successful: result.successful?.map((f) => ({
            ...f,
            uploadURL: uploadURLByFileId.current.get(f.id) ?? f.uploadURL,
          })),
        } as typeof result;

        // Clean up stored URLs for this batch.
        result.successful?.forEach((f) => uploadURLByFileId.current.delete(f.id));
        result.failed?.forEach((f) => uploadURLByFileId.current.delete(f.id));

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
