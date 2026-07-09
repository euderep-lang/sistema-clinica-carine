import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { fmt, parseBRLInput } from "@/lib/currency";

interface MoneyInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
}

/**
 * Campo de valor em reais com digitação livre.
 * Enquanto digita, aceita qualquer entrada ("602", "602,50", "1.500");
 * ao sair do campo, formata como R$. Evita o bug de reformatar a cada tecla,
 * que fazia o cursor pular e corrompia o valor digitado.
 */
export function MoneyInput({ value, onValueChange, placeholder, ...props }: MoneyInputProps) {
  const [text, setText] = useState(value ? fmt(value) : "");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value ? fmt(value) : "");
  }, [value, focused]);

  return (
    <Input
      inputMode="decimal"
      placeholder={placeholder ?? "R$ 0,00"}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        // Mostra o número cru para editar (ex.: "602,5" em vez de "R$ 602,50").
        setText(value ? String(value).replace(".", ",") : "");
        requestAnimationFrame(() => e.target.select?.());
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        onValueChange(parseBRLInput(raw));
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseBRLInput(text);
        onValueChange(parsed);
        setText(parsed ? fmt(parsed) : "");
      }}
      {...props}
    />
  );
}
