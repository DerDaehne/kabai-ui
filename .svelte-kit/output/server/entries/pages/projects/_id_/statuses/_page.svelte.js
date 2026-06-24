import { c as store_get, u as unsubscribe_stores, F as FILENAME } from "../../../../../chunks/root.js";
import { p as push_element, a as pop_element } from "../../../../../chunks/client.js";
import { A as Arrow_left } from "../../../../../chunks/arrow-left.js";
_page[FILENAME] = "src/routes/projects/[id]/statuses/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      const { id } = store_get($$store_subs ??= {}, "$props", props)();
      $$renderer2.push(`<div class="max-w-3xl">`);
      push_element($$renderer2, "div", 65, 0);
      $$renderer2.push(`<div class="mb-6">`);
      push_element($$renderer2, "div", 67, 1);
      $$renderer2.push(`<button class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4">`);
      push_element($$renderer2, "button", 68, 2);
      Arrow_left($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> Zurück zum Board</button>`);
      pop_element();
      $$renderer2.push(` <h1 class="text-2xl font-bold text-[var(--text)]">`);
      push_element($$renderer2, "h1", 76, 2);
      $$renderer2.push(`Board-Statuses</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 77, 2);
      $$renderer2.push(`Verwalte die Spalten deines Kanban-Boards</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="flex items-center justify-center py-8">`);
        push_element($$renderer2, "div", 89, 2);
        $$renderer2.push(`<svg class="animate-spin h-8 w-8 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">`);
        push_element($$renderer2, "svg", 90, 3);
        $$renderer2.push(`<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">`);
        push_element($$renderer2, "circle", 91, 4);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">`);
        push_element($$renderer2, "path", 92, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`</svg>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--></div>`);
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
