import React from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export interface RichTextRendererProps {
  content?: string | null;
  className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const elements: React.ReactNode[] = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';

  lines.forEach((line, index) => {
    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <div
            key={`code-${index}`}
            className="my-3 rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner border border-slate-800"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>{codeLanguage || 'KOD NAMOZASI'}</span>
              <span className="text-emerald-500/80">SYNTAX HIGHLIGHTED</span>
            </div>
            <pre className="whitespace-pre leading-relaxed">{codeBuffer.join('\n')}</pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.trim().replace(/^```/, '');
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    const trimmed = line.trim();

    // Callout box (> [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING])
    if (
      trimmed.startsWith('> [!NOTE]') ||
      trimmed.startsWith('> [!TIP]') ||
      trimmed.startsWith('> [!IMPORTANT]') ||
      trimmed.startsWith('> [!WARNING]')
    ) {
      const isTip = trimmed.includes('TIP');
      const isImp = trimmed.includes('IMPORTANT');
      const isWarn = trimmed.includes('WARNING');
      const cleanText = trimmed.replace(/^>\s*\[![A-Z]+\]\s*/, '');

      elements.push(
        <div
          key={`callout-${index}`}
          className={`my-3 p-3.5 rounded-2xl text-xs font-medium border-0 flex items-start gap-2.5 ${
            isTip
              ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
              : isImp
              ? 'bg-rose-500/10 text-rose-900 dark:text-rose-200'
              : isWarn
              ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200'
              : 'bg-blue-500/10 text-blue-900 dark:text-blue-200'
          }`}
        >
          {isTip ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : isWarn || isImp ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          )}
          <div className="leading-relaxed">{cleanText || 'Muhim eslatma'}</div>
        </div>
      );
      return;
    }

    // Generic quote
    if (trimmed.startsWith('>')) {
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="my-2 pl-4 border-l-4 border-primary/50 text-xs text-muted-foreground italic leading-relaxed"
        >
          {trimmed.replace(/^>\s*/, '')}
        </blockquote>
      );
      return;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h5 key={`h5-${index}`} className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-3 mb-1">
          {formatInlineRichText(trimmed.replace(/^####\s+/, ''))}
        </h5>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${index}`} className="text-sm font-bold text-foreground mt-3 mb-1">
          {formatInlineRichText(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${index}`} className="text-base font-extrabold text-foreground mt-4 mb-2 pb-1 border-b border-border/15">
          {formatInlineRichText(trimmed.replace(/^##\s+/, ''))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${index}`} className="text-lg font-black text-foreground mt-4 mb-2">
          {formatInlineRichText(trimmed.replace(/^#\s+/, ''))}
        </h2>
      );
      return;
    }

    // Horizontal Rule
    if (trimmed === '---') {
      elements.push(<hr key={`hr-${index}`} className="my-3 border-border/20" />);
      return;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={`li-${index}`} className="ml-4 list-disc text-xs sm:text-sm text-foreground/90 leading-relaxed my-0.5">
          {formatInlineRichText(trimmed.replace(/^[-*]\s*/, ''))}
        </li>
      );
      return;
    }

    // Numbered list
    if (/^[0-9]+\.\s+/.test(trimmed)) {
      elements.push(
        <li key={`num-${index}`} className="ml-4 list-decimal text-xs sm:text-sm text-foreground/90 leading-relaxed my-0.5">
          {formatInlineRichText(trimmed.replace(/^[0-9]+\.\s*/, ''))}
        </li>
      );
      return;
    }

    // Empty line
    if (!trimmed) {
      elements.push(<div key={`spacer-${index}`} className="h-1.5" />);
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${index}`} className="text-xs sm:text-sm text-foreground/90 leading-relaxed my-1">
        {formatInlineRichText(line)}
      </p>
    );
  });

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};

// Inline rich text formatting: **bold**, `code`, *italic*
export function formatInlineRichText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-muted text-primary font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic text-foreground/80">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
