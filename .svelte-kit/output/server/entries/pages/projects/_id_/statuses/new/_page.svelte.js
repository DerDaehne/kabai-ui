import { c as store_get, j as attr, e as escape_html, u as unsubscribe_stores, F as FILENAME } from "../../../../../../chunks/root.js";
import { p as push_element, a as pop_element } from "../../../../../../chunks/client.js";
import { z } from "zod";
import { A as Arrow_left } from "../../../../../../chunks/arrow-left.js";
_page[FILENAME] = "src/routes/projects/[id]/statuses/new/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let display_name = "";
      let name = "";
      let position = 0;
      let agent_role_instruction = "";
      let isLoading = false;
      const { id } = store_get($$store_subs ??= {}, "$props", props)();
      z.object({
        name: z.string().min(1, "Name ist erforderlich").regex(/^[a-z0-9_]+$/, "Name darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten"),
        display_name: z.string().min(1, "Anzeigename ist erforderlich"),
        position: z.number().int().min(0, "Position muss eine positive Zahl sein"),
        agent_role_instruction: z.string().optional()
      });
      $$renderer2.push(`<div class="max-w-2xl">`);
      push_element($$renderer2, "div", 84, 0);
      $$renderer2.push(`<div class="mb-6">`);
      push_element($$renderer2, "div", 86, 1);
      $$renderer2.push(`<button class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4">`);
      push_element($$renderer2, "button", 87, 2);
      Arrow_left($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> Zurück zu Statuses</button>`);
      pop_element();
      $$renderer2.push(` <h1 class="text-2xl font-bold text-[var(--text)]">`);
      push_element($$renderer2, "h1", 95, 2);
      $$renderer2.push(`Neuer Status</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 96, 2);
      $$renderer2.push(`Erstellen Sie einen neuen Board-Status</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div class="card p-6">`);
      push_element($$renderer2, "div", 100, 1);
      $$renderer2.push(`<form class="space-y-4">`);
      push_element($$renderer2, "form", 101, 2);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 103, 3);
      $$renderer2.push(`<label class="label" for="display_name">`);
      push_element($$renderer2, "label", 104, 4);
      $$renderer2.push(`Anzeigename *</label>`);
      pop_element();
      $$renderer2.push(` <input id="display_name" type="text"${attr("value", display_name)} class="input" placeholder="z.B. In Bearbeitung, Fertig, Blockiert" required=""/>`);
      push_element($$renderer2, "input", 105, 4);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 116, 3);
      $$renderer2.push(`<label class="label" for="name">`);
      push_element($$renderer2, "label", 117, 4);
      $$renderer2.push(`Name (Code) *</label>`);
      pop_element();
      $$renderer2.push(` <div class="flex gap-2">`);
      push_element($$renderer2, "div", 118, 4);
      $$renderer2.push(`<input id="name" type="text"${attr("value", name)} class="input flex-1 font-mono" placeholder="z.B. in_progress, done, blocked" required=""/>`);
      push_element($$renderer2, "input", 119, 5);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <p class="text-xs text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 128, 4);
      $$renderer2.push(`Nur Kleinbuchstaben, Zahlen und Unterstriche. Wird automatisch aus dem Anzeigenamen generiert.</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 134, 3);
      $$renderer2.push(`<label class="label" for="position">`);
      push_element($$renderer2, "label", 135, 4);
      $$renderer2.push(`Position</label>`);
      pop_element();
      $$renderer2.push(` <input id="position" type="number"${attr("value", position)} class="input" placeholder="0" min="0"/>`);
      push_element($$renderer2, "input", 136, 4);
      pop_element();
      $$renderer2.push(` <p class="text-xs text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 144, 4);
      $$renderer2.push(`Bestimmt die Reihenfolge der Spalten im Board.</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 150, 3);
      $$renderer2.push(`<label class="label" for="agent_role_instruction">`);
      push_element($$renderer2, "label", 151, 4);
      $$renderer2.push(`Agent-Rollen-Instruktion</label>`);
      pop_element();
      $$renderer2.push(` <textarea id="agent_role_instruction" class="input min-h-[100px] resize-vertical" placeholder="Beschreiben Sie, welche Rolle der Agent in diesem Status hat...">`);
      push_element($$renderer2, "textarea", 152, 4);
      const $$body = escape_html(agent_role_instruction);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea>`);
      pop_element();
      $$renderer2.push(` <p class="text-xs text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 158, 4);
      $$renderer2.push(`Optional. Wird für KI-Agenten verwendet.</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="flex gap-3 pt-4">`);
      push_element($$renderer2, "div", 171, 3);
      $$renderer2.push(`<button type="button" class="btn btn-ghost">`);
      push_element($$renderer2, "button", 172, 4);
      $$renderer2.push(`Abbrechen</button>`);
      pop_element();
      $$renderer2.push(` <button type="submit" class="btn btn-primary flex-1"${attr("disabled", isLoading, true)}>`);
      push_element($$renderer2, "button", 179, 4);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`Status erstellen`);
      }
      $$renderer2.push(`<!--]--></button>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</form>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      if ($$store_subs) unsubscribe_stores($$store_subs);
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  _page as default
};
