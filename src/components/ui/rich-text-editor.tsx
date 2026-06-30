import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Columns2,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const RICH_FONTS = [
  { label: "Padrão", value: "Helvetica, Arial, sans-serif" },
  { label: "Serifada", value: "'Times New Roman', Times, serif" },
  { label: "Monoespaçada", value: "'Courier New', Courier, monospace" },
] as const;

export const RICH_SIZES = [9, 10, 11, 12, 14, 16, 18, 22] as const;

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

/**
 * Editor de texto rico simples (sem dependências externas) baseado em
 * `contenteditable` + `document.execCommand`. Produz HTML com estilos inline
 * (fonte, tamanho, negrito, itálico, sublinhado) e listas, que é renderizado
 * fielmente no PDF por `renderRichTextToPdf`.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 220,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [sizeValue, setSizeValue] = useState("11");

  // Inicializa o conteúdo apenas na montagem (componente não-controlado).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      ref.current &&
      ref.current.contains(sel.getRangeAt(0).commonAncestorContainer)
    ) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else {
      ref.current?.focus();
    }
  };

  const exec = (command: string, value?: string) => {
    ref.current?.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* noop */
    }
    document.execCommand(command, false, value);
    emit();
  };

  const setFontFamily = (family: string) => {
    if (!family) return;
    restoreSelection();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* noop */
    }
    document.execCommand("fontName", false, family);
    emit();
  };

  const setFontSize = (pt: string) => {
    const n = Number(pt);
    if (!pt || Number.isNaN(n) || n <= 0) return;
    restoreSelection();
    document.execCommand("fontSize", false, "7");
    const root = ref.current;
    if (root) {
      root.querySelectorAll('font[size="7"]').forEach((el) => {
        const f = el as HTMLElement;
        f.removeAttribute("size");
        f.style.fontSize = `${n}pt`;
      });
    }
    emit();
  };

  const closestEl = (
    start: Node | null,
    test: (el: HTMLElement) => boolean,
  ): HTMLElement | null => {
    let node: Node | null = start;
    while (node && node !== ref.current) {
      if (node.nodeType === 1 && test(node as HTMLElement)) return node as HTMLElement;
      node = node.parentNode;
    }
    return null;
  };

  const toggleTwoColumns = () => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    // 1) Já está em colunas? Desfaz (desempacota o conteúdo).
    const existing = closestEl(
      range.commonAncestorContainer,
      (el) => el.dataset?.rteCols === "1",
    );
    if (existing && existing.parentNode) {
      const parent = existing.parentNode;
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
      parent.removeChild(existing);
      emit();
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.dataset.rteCols = "1";
    wrapper.style.columnCount = "2";
    wrapper.style.columnGap = "24px";

    // 2) Cursor/seleção dentro de uma lista → envolve a lista inteira
    //    (robusto, sem fragmentar nem perder itens).
    const listEl = closestEl(
      range.commonAncestorContainer,
      (el) => el.tagName === "UL" || el.tagName === "OL",
    );
    if (listEl && listEl.parentNode) {
      listEl.parentNode.insertBefore(wrapper, listEl);
      wrapper.appendChild(listEl);
      emit();
      return;
    }

    // 3) Caso geral: envolve o conteúdo selecionado.
    if (range.collapsed) return;
    try {
      const frag = range.extractContents();
      if (!frag.childNodes.length) return;
      wrapper.appendChild(frag);
      range.insertNode(wrapper);
    } catch {
      // Evita perda de conteúdo caso a inserção falhe.
      if (wrapper.childNodes.length && !wrapper.parentNode) {
        ref.current?.appendChild(wrapper);
      }
    }
    emit();
  };

  return (
    <div className={cn("overflow-hidden rounded-md border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-1.5 py-1">
        <select
          aria-label="Fonte"
          className="h-7 rounded border bg-background px-1 text-xs"
          defaultValue=""
          onChange={(e) => {
            setFontFamily(e.target.value);
            e.target.selectedIndex = 0;
          }}
        >
          <option value="" disabled>
            Fonte
          </option>
          {RICH_FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          inputMode="numeric"
          min={6}
          max={120}
          aria-label="Tamanho da fonte"
          title="Tamanho da fonte (Enter para aplicar)"
          list="rte-font-sizes"
          value={sizeValue}
          onChange={(e) => setSizeValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setFontSize(sizeValue);
            }
          }}
          className="h-7 w-14 rounded border bg-background px-1.5 text-xs"
        />
        <datalist id="rte-font-sizes">
          {RICH_SIZES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <span className="mx-0.5 h-5 w-px bg-border" />

        <ToolbarButton label="Negrito" onClick={() => exec("bold")}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Itálico" onClick={() => exec("italic")}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Sublinhado" onClick={() => exec("underline")}>
          <Underline className="size-4" />
        </ToolbarButton>

        <span className="mx-0.5 h-5 w-px bg-border" />

        <ToolbarButton label="Lista com marcadores" onClick={() => exec("insertUnorderedList")}>
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="size-4" />
        </ToolbarButton>

        <span className="mx-0.5 h-5 w-px bg-border" />

        <ToolbarButton label="Duas colunas (lista ou texto selecionado)" onClick={toggleTwoColumns}>
          <Columns2 className="size-4" />
        </ToolbarButton>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onBlur={() => {
          saveSelection();
          emit();
        }}
        className={cn(
          "rich-text-editor-content px-3 py-2 text-sm leading-relaxed outline-none",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6",
          "[&_[data-rte-cols='1']]:[column-count:2] [&_[data-rte-cols='1']]:[column-gap:24px]",
        )}
        style={{ minHeight }}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
    >
      {children}
    </button>
  );
}
