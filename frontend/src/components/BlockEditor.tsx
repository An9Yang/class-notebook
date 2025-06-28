import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import CodeBlock from '@tiptap/extension-code-block';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import '../styles/BlockEditor.css';

interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

interface CommandItem {
  title: string;
  command: () => void;
  icon: string;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  content,
  onChange,
  placeholder = '点击这里开始输入，或输入 "/" 使用命令',
  readOnly = false
}) => {
  const isInternalUpdate = useRef(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // 使用自定义的 CodeBlock
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return '标题';
          }
          if (node.type.name === 'codeBlock') {
            return '输入代码...';
          }
          return placeholder;
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      CodeBlock.configure({
        languageClassPrefix: 'language-',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (!isInternalUpdate.current) {
        const html = editor.getHTML();
        onChange(html);
      }
    },
  });

  // 当外部 content 改变时更新编辑器
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      isInternalUpdate.current = true;
      editor.commands.setContent(content);
      isInternalUpdate.current = false;
    }
  }, [content, editor]);

  // 命令列表
  const commands: CommandItem[] = [
    {
      title: '标题 1',
      command: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
      icon: 'H1'
    },
    {
      title: '标题 2', 
      command: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      icon: 'H2'
    },
    {
      title: '标题 3',
      command: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
      icon: 'H3'
    },
    {
      title: '无序列表',
      command: () => editor?.chain().focus().toggleBulletList().run(),
      icon: '•'
    },
    {
      title: '有序列表',
      command: () => editor?.chain().focus().toggleOrderedList().run(),
      icon: '1.'
    },
    {
      title: '任务列表',
      command: () => editor?.chain().focus().toggleTaskList().run(),
      icon: '☐'
    },
    {
      title: '代码块',
      command: () => editor?.chain().focus().toggleCodeBlock().run(),
      icon: '</>'
    },
    {
      title: '引用',
      command: () => editor?.chain().focus().toggleBlockquote().run(),
      icon: '"'
    },
    {
      title: '分隔线',
      command: () => editor?.chain().focus().setHorizontalRule().run(),
      icon: '—'
    },
    {
      title: '表格',
      command: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      icon: '⊞'
    }
  ];

  // 过滤命令
  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 监听斜杠命令
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/') {
        const { state } = editor;
        const { selection } = state;
        const { empty, $from } = selection;
        
        if (empty && $from.parent.textContent === '') {
          setTimeout(() => {
            const coords = editor.view.coordsAtPos(selection.from);
            setSlashMenuPosition({
              top: coords.top + 25,
              left: coords.left
            });
            setShowSlashMenu(true);
            setSearchQuery('');
          }, 0);
        }
      } else if (event.key === 'Escape' && showSlashMenu) {
        setShowSlashMenu(false);
        setSearchQuery('');
      }
    };

    const handleClick = () => {
      if (showSlashMenu) {
        setShowSlashMenu(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, [editor, showSlashMenu]);

  // 执行命令
  const executeCommand = useCallback((command: () => void) => {
    // 删除斜杠
    editor?.chain().focus().deleteRange({
      from: editor.state.selection.from - 1,
      to: editor.state.selection.from
    }).run();
    
    // 执行命令
    command();
    
    // 关闭菜单
    setShowSlashMenu(false);
    setSearchQuery('');
  }, [editor]);

  // 命令菜单
  const insertBlock = (type: string) => {
    if (!editor) return;

    switch (type) {
      case 'heading1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'taskList':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'horizontalRule':
        editor.chain().focus().setHorizontalRule().run();
        break;
      case 'table':
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="block-editor-container">
      <div className="block-editor-toolbar">
        <button
          onClick={() => insertBlock('heading1')}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          title="标题 1"
        >
          <span className="toolbar-icon">H1</span>
        </button>
        <button
          onClick={() => insertBlock('heading2')}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          title="标题 2"
        >
          <span className="toolbar-icon">H2</span>
        </button>
        <button
          onClick={() => insertBlock('heading3')}
          className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
          title="标题 3"
        >
          <span className="toolbar-icon">H3</span>
        </button>
        
        <div className="toolbar-divider" />
        
        <button
          onClick={() => insertBlock('bulletList')}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="无序列表"
        >
          <span className="toolbar-icon">•</span>
        </button>
        <button
          onClick={() => insertBlock('orderedList')}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="有序列表"
        >
          <span className="toolbar-icon">1.</span>
        </button>
        <button
          onClick={() => insertBlock('taskList')}
          className={editor.isActive('taskList') ? 'is-active' : ''}
          title="任务列表"
        >
          <span className="toolbar-icon">☐</span>
        </button>
        
        <div className="toolbar-divider" />
        
        <button
          onClick={() => insertBlock('codeBlock')}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          title="代码块"
        >
          <span className="toolbar-icon">&lt;/&gt;</span>
        </button>
        <button
          onClick={() => insertBlock('blockquote')}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          title="引用"
        >
          <span className="toolbar-icon">"</span>
        </button>
        <button
          onClick={() => insertBlock('horizontalRule')}
          title="分隔线"
        >
          <span className="toolbar-icon">—</span>
        </button>
        <button
          onClick={() => insertBlock('table')}
          title="表格"
        >
          <span className="toolbar-icon">⊞</span>
        </button>
      </div>
      
      <EditorContent editor={editor} className="block-editor-content" />
      
      {/* 浮动格式菜单 */}
      {editor && (
        <BubbleMenu 
          className="bubble-menu" 
          tippyOptions={{ duration: 100 }}
          editor={editor}
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'is-active' : ''}
          >
            U
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={editor.isActive('highlight') ? 'is-active' : ''}
          >
            高亮
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'is-active' : ''}
          >
            &lt;/&gt;
          </button>
        </BubbleMenu>
      )}
      
      {/* 斜杠命令菜单 */}
      {showSlashMenu && (
        <div 
          className="slash-menu"
          style={{
            position: 'fixed',
            top: `${slashMenuPosition.top}px`,
            left: `${slashMenuPosition.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            placeholder="搜索命令..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="slash-menu-search"
            autoFocus
          />
          <div className="slash-menu-items">
            {filteredCommands.map((cmd, index) => (
              <button
                key={index}
                className="slash-menu-item"
                onClick={() => executeCommand(cmd.command)}
              >
                <span className="slash-menu-icon">{cmd.icon}</span>
                <span className="slash-menu-title">{cmd.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="block-editor-tips">
        <p>💡 使用技巧：</p>
        <ul>
          <li>输入 <code>/</code> 可以快速插入块</li>
          <li>按 <code>Enter</code> 创建新段落</li>
          <li>按 <code>Shift + Enter</code> 在同一段落内换行</li>
          <li>选中文本可以看到格式化选项</li>
          <li>使用 <code>Tab</code> 和 <code>Shift + Tab</code> 调整列表缩进</li>
        </ul>
      </div>
    </div>
  );
};

export default BlockEditor;