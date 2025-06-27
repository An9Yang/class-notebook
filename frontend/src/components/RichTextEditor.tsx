import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import { plainTextToHTML, isHTML } from '../utils/textUtils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const MenuBar: React.FC<{ editor: any }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div style={styles.menuBar}>
      {/* 文本格式 */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('bold') ? styles.menuButtonActive : {})
        }}
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('italic') ? styles.menuButtonActive : {})
        }}
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('underline') ? styles.menuButtonActive : {})
        }}
      >
        <u>U</u>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('strike') ? styles.menuButtonActive : {})
        }}
      >
        <s>S</s>
      </button>
      
      <span style={styles.separator}>|</span>
      
      {/* 标题 */}
      <select
        onChange={(e) => {
          const value = e.target.value;
          if (value === 'paragraph') {
            editor.chain().focus().setParagraph().run();
          } else {
            const level = parseInt(value.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6;
            editor.chain().focus().toggleHeading({ level }).run();
          }
        }}
        style={styles.select}
        value={
          editor.isActive('heading', { level: 1 }) ? 'h1' :
          editor.isActive('heading', { level: 2 }) ? 'h2' :
          editor.isActive('heading', { level: 3 }) ? 'h3' :
          'paragraph'
        }
      >
        <option value="paragraph">正文</option>
        <option value="h1">标题 1</option>
        <option value="h2">标题 2</option>
        <option value="h3">标题 3</option>
      </select>
      
      <span style={styles.separator}>|</span>
      
      {/* 列表 */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('bulletList') ? styles.menuButtonActive : {})
        }}
      >
        • 列表
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('orderedList') ? styles.menuButtonActive : {})
        }}
      >
        1. 列表
      </button>
      
      <span style={styles.separator}>|</span>
      
      {/* 引用和代码 */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('blockquote') ? styles.menuButtonActive : {})
        }}
      >
        " 引用
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('code') ? styles.menuButtonActive : {})
        }}
      >
        {'<>'}
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('codeBlock') ? styles.menuButtonActive : {})
        }}
      >
        {'</>'}
      </button>
      
      <span style={styles.separator}>|</span>
      
      {/* 高亮 */}
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('highlight') ? styles.menuButtonActive : {})
        }}
      >
        🖍️ 高亮
      </button>
      
      <span style={styles.separator}>|</span>
      
      {/* 对齐 */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive({ textAlign: 'left' }) ? styles.menuButtonActive : {})
        }}
      >
        ⬅️
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive({ textAlign: 'center' }) ? styles.menuButtonActive : {})
        }}
      >
        ⬆️
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        style={{
          ...styles.menuButton,
          ...(editor.isActive({ textAlign: 'right' }) ? styles.menuButtonActive : {})
        }}
      >
        ➡️
      </button>
      
      <span style={styles.separator}>|</span>
      
      {/* 链接 */}
      <button
        onClick={() => {
          const previousUrl = editor.getAttributes('link').href;
          const url = window.prompt('URL', previousUrl);
          
          if (url === null) {
            return;
          }
          
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }
          
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
        style={{
          ...styles.menuButton,
          ...(editor.isActive('link') ? styles.menuButtonActive : {})
        }}
      >
        🔗
      </button>
      
      <span style={styles.separator}>|</span>
      
      {/* 撤销/重做 */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        style={styles.menuButton}
      >
        ↩️
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        style={styles.menuButton}
      >
        ↪️
      </button>
    </div>
  );
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = '开始输入...',
  readOnly = false
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Color,
      TextStyle,
    ],
    content: isHTML(content) ? content : plainTextToHTML(content),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div style={styles.container}>
      {!readOnly && <MenuBar editor={editor} />}
      <EditorContent 
        editor={editor} 
        style={styles.editor}
        placeholder={placeholder}
      />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  menuBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#f8f9fa',
    flexWrap: 'wrap',
    gap: '5px',
  },
  menuButton: {
    padding: '5px 10px',
    border: '1px solid transparent',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    minWidth: '30px',
  },
  menuButtonActive: {
    backgroundColor: '#e0e0e0',
    borderColor: '#ccc',
  },
  separator: {
    color: '#ddd',
    margin: '0 5px',
  },
  select: {
    padding: '5px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  },
  editor: {
    minHeight: '300px',
    padding: '15px',
    fontSize: '16px',
    lineHeight: '1.6',
  }
};

export default RichTextEditor;