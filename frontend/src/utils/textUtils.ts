/**
 * 检查字符串是否包含HTML标签
 */
export function isHTML(text: string): boolean {
  if (!text) return false;
  
  // 检查常见的HTML标签
  const htmlPattern = /<\/?(?:p|h[1-6]|ul|ol|li|blockquote|pre|code|strong|em|u|s|mark|a|br|div|span)\b[^>]*>/i;
  return htmlPattern.test(text);
}

/**
 * 将纯文本转换为HTML
 */
export function plainTextToHTML(text: string): string {
  if (!text) return '';
  
  // 如果已经是HTML，直接返回
  if (isHTML(text)) return text;
  
  // 转义HTML特殊字符
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // 将换行转换为段落
  const paragraphs = escaped
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => {
      // 将单个换行转换为<br>
      const withBreaks = p.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    });
  
  return paragraphs.join('');
}

/**
 * 从HTML中提取纯文本（用于搜索）
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  // 如果不是HTML，直接返回
  if (!isHTML(html)) return html;
  
  // 移除HTML标签
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}