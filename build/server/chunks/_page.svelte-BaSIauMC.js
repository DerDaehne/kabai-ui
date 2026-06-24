import { a9 as attr, T as escape_html, _ as FILENAME } from './exports-Css8F_Cx.js';
import { p as push_element, a as pop_element } from './client-J9yR4JjB.js';
import { z } from 'zod';

_page[FILENAME] = "src/routes/projects/new/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let name = "";
      let slug = "";
      let description = "";
      let isLoading = false;
      z.object({
        name: z.string().min(1, "Name ist erforderlich"),
        slug: z.string().min(1, "Slug ist erforderlich").regex(/^[a-z0-9-]+$/, "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten"),
        description: z.string().optional()
      });
      $$renderer2.push(`<div class="max-w-2xl">`);
      push_element($$renderer2, "div", 75, 0);
      $$renderer2.push(`<div class="mb-6">`);
      push_element($$renderer2, "div", 77, 1);
      $$renderer2.push(`<h1 class="text-2xl font-bold text-[var(--text)]">`);
      push_element($$renderer2, "h1", 78, 2);
      $$renderer2.push(`Neues Projekt</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 79, 2);
      $$renderer2.push(`Erstellen Sie ein neues Kanban-Board</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div class="card p-6">`);
      push_element($$renderer2, "div", 83, 1);
      $$renderer2.push(`<form class="space-y-4">`);
      push_element($$renderer2, "form", 84, 2);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 86, 3);
      $$renderer2.push(`<label class="label" for="name">`);
      push_element($$renderer2, "label", 87, 4);
      $$renderer2.push(`Name *</label>`);
      pop_element();
      $$renderer2.push(` <input id="name" type="text"${attr("value", name)} class="input" placeholder="z.B. Website-Relaunch, Produktentwicklung" required=""/>`);
      push_element($$renderer2, "input", 88, 4);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 99, 3);
      $$renderer2.push(`<label class="label" for="slug">`);
      push_element($$renderer2, "label", 100, 4);
      $$renderer2.push(`Slug *</label>`);
      pop_element();
      $$renderer2.push(` <div class="flex gap-2">`);
      push_element($$renderer2, "div", 101, 4);
      $$renderer2.push(`<input id="slug" type="text"${attr("value", slug)} class="input flex-1" placeholder="z.B. website-relaunch, produktentwicklung" required=""/>`);
      push_element($$renderer2, "input", 102, 5);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <p class="text-xs text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 111, 4);
      $$renderer2.push(`Nur Kleinbuchstaben, Zahlen und Bindestriche. Wird automatisch aus dem Namen generiert.</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 117, 3);
      $$renderer2.push(`<label class="label" for="description">`);
      push_element($$renderer2, "label", 118, 4);
      $$renderer2.push(`Beschreibung</label>`);
      pop_element();
      $$renderer2.push(` <textarea id="description" class="input min-h-[100px] resize-vertical" placeholder="Beschreiben Sie das Projekt...">`);
      push_element($$renderer2, "textarea", 119, 4);
      const $$body = escape_html(description);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="flex gap-3 pt-4">`);
      push_element($$renderer2, "div", 135, 3);
      $$renderer2.push(`<button type="button" class="btn btn-ghost">`);
      push_element($$renderer2, "button", 136, 4);
      $$renderer2.push(`Abbrechen</button>`);
      pop_element();
      $$renderer2.push(` <button type="submit" class="btn btn-primary flex-1"${attr("disabled", isLoading, true)}>`);
      push_element($$renderer2, "button", 143, 4);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`Projekt erstellen`);
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
    },
    _page
  );
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { _page as default };
//# sourceMappingURL=_page.svelte-BaSIauMC.js.map
