import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { marked } from "marked";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  ImagePlus,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
  FileDown,
  Sparkles,
  RefreshCw,
  Expand,
  AlignJustify,
  Scissors,
  SpellCheck,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import "./RichTextEditor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

type AiAction = "rewrite" | "expand" | "summarize" | "fixGrammar" | "makeShorter";

const AI_ACTIONS: { action: AiAction; label: string; icon: React.ReactNode }[] = [
  { action: "rewrite", label: "Rewrite", icon: <RefreshCw className="h-3 w-3" /> },
  { action: "expand", label: "Expand", icon: <Expand className="h-3 w-3" /> },
  { action: "summarize", label: "Summarize", icon: <AlignJustify className="h-3 w-3" /> },
  { action: "fixGrammar", label: "Fix grammar", icon: <SpellCheck className="h-3 w-3" /> },
  { action: "makeShorter", label: "Shorten", icon: <Scissors className="h-3 w-3" /> },
];

async function uploadImageFile(file: File): Promise<string> {
  const reqRes = await fetch("/api/uploads/request-url", {
    method: "POST",
    credentials: "include",
  });
  if (!reqRes.ok) {
    const err = await reqRes.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Failed to request upload URL",
    );
  }
  const { uploadURL, objectPath } = (await reqRes.json()) as {
    uploadURL: string;
    objectPath: string;
  };

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Failed to upload file to storage");

  const finalRes = await fetch("/api/uploads/finalize", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadURL }),
  });
  if (!finalRes.ok) throw new Error("Failed to finalize upload");
  const { objectPath: finalPath } = (await finalRes.json()) as {
    objectPath: string;
  };

  return `/objects/${finalPath}`;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing your post…",
  className,
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [mdDialogOpen, setMdDialogOpen] = useState(false);
  const [mdText, setMdText] = useState("");
  const [mdMode, setMdMode] = useState<"replace" | "append">("replace");
  const [aiLoading, setAiLoading] = useState<AiAction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[280px] px-4 py-3",
      },
    },
  });

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      try {
        const url = await uploadImageFile(file);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Image upload failed");
      } finally {
        setUploading(false);
      }
    },
    [editor],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleImageUpload(file);
      e.target.value = "";
    },
    [handleImageUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith("image/")) {
        e.preventDefault();
        void handleImageUpload(file);
      }
    },
    [handleImageUpload],
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const handleImportMarkdown = useCallback(() => {
    if (!editor || !mdText.trim()) return;
    try {
      const html = marked.parse(mdText, { async: false }) as string;
      if (mdMode === "replace") {
        editor.commands.setContent(html);
      } else {
        editor.commands.insertContentAt(
          editor.state.doc.content.size,
          html,
          { parseOptions: { preserveWhitespace: false } },
        );
      }
      onChange(editor.getHTML());
      setMdDialogOpen(false);
      setMdText("");
      toast.success(
        mdMode === "replace"
          ? "Markdown imported — editor content replaced"
          : "Markdown appended to editor",
      );
    } catch {
      toast.error("Failed to parse Markdown");
    }
  }, [editor, mdText, mdMode, onChange]);

  const handleAiAction = useCallback(
    async (action: AiAction) => {
      if (!editor || aiLoading) return;

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, "\n");
      if (!selectedText.trim()) {
        toast.error("Select some text first, then choose an AI action.");
        return;
      }

      setAiLoading(action);
      try {
        const res = await fetch("/api/ai/write-assist", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: selectedText, action }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ?? "AI request failed",
          );
        }

        const { result } = (await res.json()) as { result: string };

        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContentAt(from, result)
          .run();

        onChange(editor.getHTML());
        toast.success("AI suggestion applied");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "AI request failed",
        );
      } finally {
        setAiLoading(null);
      }
    },
    [editor, aiLoading, onChange],
  );

  if (!editor) return null;

  const btn = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    title: string,
    disabled = false,
  ) => (
    <Toggle
      size="sm"
      pressed={active}
      onPressedChange={() => onClick()}
      title={title}
      disabled={disabled}
      className="h-7 w-7 p-0 data-[state=on]:bg-muted data-[state=on]:text-foreground"
    >
      {icon}
    </Toggle>
  );

  return (
    <>
      {/* AI bubble menu — appears when text is selected */}
      <BubbleMenu
        editor={editor}
        options={{ placement: "top-start" }}
        shouldShow={({ from, to, editor: ed }) => {
          return from !== to && !ed.isActive("image");
        }}
      >
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover shadow-lg px-1.5 py-1">
          <Sparkles className="h-3 w-3 text-primary mr-1 shrink-0" />
          {AI_ACTIONS.map(({ action, label, icon }) => (
            <button
              key={action}
              onClick={() => void handleAiAction(action)}
              disabled={aiLoading !== null}
              title={label}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {aiLoading === action ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                icon
              )}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </BubbleMenu>

      <div
        className={[
          "rounded-md border border-input bg-background text-sm shadow-sm",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-2 py-1.5">
          {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-3.5 w-3.5" />, "Bold")}
          {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3.5 w-3.5" />, "Italic")}
          {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon className="h-3.5 w-3.5" />, "Underline")}
          {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), <Strikethrough className="h-3.5 w-3.5" />, "Strikethrough")}

          <Separator orientation="vertical" className="mx-1 h-5" />

          {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 className="h-3.5 w-3.5" />, "Heading 1")}
          {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-3.5 w-3.5" />, "Heading 2")}
          {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-3.5 w-3.5" />, "Heading 3")}

          <Separator orientation="vertical" className="mx-1 h-5" />

          {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />, "Bullet list")}
          {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />, "Numbered list")}
          {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <Quote className="h-3.5 w-3.5" />, "Blockquote")}
          {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), <Code className="h-3.5 w-3.5" />, "Inline code")}

          <Separator orientation="vertical" className="mx-1 h-5" />

          {btn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), <AlignLeft className="h-3.5 w-3.5" />, "Align left")}
          {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), <AlignCenter className="h-3.5 w-3.5" />, "Align center")}
          {btn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), <AlignRight className="h-3.5 w-3.5" />, "Align right")}

          <Separator orientation="vertical" className="mx-1 h-5" />

          {btn(editor.isActive("link"), setLink, <LinkIcon className="h-3.5 w-3.5" />, "Insert / edit link")}

          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => fileInputRef.current?.click()}
            title="Insert image"
            disabled={uploading}
            className="h-7 w-7 p-0"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
          </Toggle>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
            className="h-7 w-7 p-0"
          >
            <Undo className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
            className="h-7 w-7 p-0"
          >
            <Redo className="h-3.5 w-3.5" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => {
              setMdText("");
              setMdMode("replace");
              setMdDialogOpen(true);
            }}
            title="Import Markdown"
            className="h-7 px-2 gap-1 w-auto text-xs font-medium"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Markdown</span>
          </Toggle>
        </div>

        <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          <EditorContent editor={editor} />
        </div>

        {uploading && (
          <div className="flex items-center gap-1.5 border-t border-input px-3 py-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading image…
          </div>
        )}

        {aiLoading && (
          <div className="flex items-center gap-1.5 border-t border-input px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 animate-pulse text-primary" />
            AI is working on your selection…
          </div>
        )}
      </div>

      <Dialog open={mdDialogOpen} onOpenChange={setMdDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Import Markdown
            </DialogTitle>
            <DialogDescription>
              Paste your Markdown below. It will be converted to rich text and
              inserted into the editor.
            </DialogDescription>
          </DialogHeader>

          <textarea
            className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring min-h-[280px] resize-y"
            placeholder={"# Your heading\n\nParagraph text with **bold**, *italic*, and [links](https://example.com).\n\n## Section two\n\n- Bullet one\n- Bullet two"}
            value={mdText}
            onChange={(e) => setMdText(e.target.value)}
            spellCheck={false}
          />

          <div className="flex items-center gap-3 rounded-md border border-input bg-muted/20 px-3 py-2 text-sm">
            <span className="text-muted-foreground shrink-0">Insert as:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mdMode"
                value="replace"
                checked={mdMode === "replace"}
                onChange={() => setMdMode("replace")}
                className="accent-primary"
              />
              <span>Replace editor content</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mdMode"
                value="append"
                checked={mdMode === "append"}
                onChange={() => setMdMode("append")}
                className="accent-primary"
              />
              <span>Append to existing content</span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMdDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportMarkdown} disabled={!mdText.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
