import { describe, expect, it } from "vitest";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import it_ from "../messages/it.json";
import en from "../messages/en.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

// Nomi degli argomenti ICU ({name}, {count, plural, …}), anche annidati nei plurali.
// parse() lancia un errore se un messaggio non è ICU valido: è un controllo in più.
function placeholders(s: string): string[] {
  const out = new Set<string>();
  const walk = (els: MessageFormatElement[]) => {
    for (const el of els) {
      if (el.type !== TYPE.literal && el.type !== TYPE.pound) out.add(el.value);
      if ("options" in el) for (const o of Object.values(el.options)) walk(o.value);
      if (el.type === TYPE.tag) walk(el.children);
    }
  };
  walk(parse(s));
  return [...out].sort();
}

describe("translations", () => {
  it("it.json and en.json have the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(it_).sort());
  });

  it("every message uses the same placeholders in both languages", () => {
    const get = (o: Record<string, unknown>, path: string) =>
      path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], o) as string;
    for (const k of keys(it_)) {
      expect(placeholders(get(en, k)), k).toEqual(placeholders(get(it_, k)));
    }
  });
});
