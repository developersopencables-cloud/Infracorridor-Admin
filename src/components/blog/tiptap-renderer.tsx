"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import { cn } from "@/utils/utils";

interface TipTapRendererProps {
  content: string;
  className?: string;
}

export function TipTapRenderer({ content, className }: TipTapRendererProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg my-4",
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4 hover:text-primary/80",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: content ? JSON.parse(content) : undefined,
    editable: false,
    editorProps: {
      attributes: {
        class: "text-base lg:text-lg",
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      try {
        editor.commands.setContent(JSON.parse(content));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [editor, content]);

  if (!content) {
    return null;
  }

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}
