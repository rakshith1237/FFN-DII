'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { ReactNode } from 'react'

interface TiptapEditorProps {
  content:   string
  onChange:  (html: string) => void
  label?:    ReactNode
  disabled?: boolean
}

export default function TiptapEditor({ content, onChange, label, disabled = false }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="text-[13px] font-semibold text-[#374151]">{label}</div>
      )}
      <div
        className={`min-h-[200px] rounded-[6px] border text-[14px] text-[#374151] ${
          disabled
            ? 'border-[#E5E7EB] bg-[#F9FAFB] opacity-60 cursor-not-allowed'
            : 'border-[#D1D5DB] bg-white focus-within:ring-2 focus-within:ring-[#3B82F6] focus-within:border-transparent'
        }`}
      >
        <EditorContent
          editor={editor}
          className="p-3 prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px]"
        />
      </div>
    </div>
  )
}
