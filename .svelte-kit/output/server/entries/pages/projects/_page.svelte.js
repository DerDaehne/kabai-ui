import { s as sanitize_props, a as spread_props, p as prevent_snippet_stringification, F as FILENAME, b as slot } from "../../../chunks/root.js";
import "clsx";
import { p as push_element, a as pop_element } from "../../../chunks/client.js";
import { I as Icon } from "../../../chunks/Icon.js";
Plus[FILENAME] = "node_modules/lucide-svelte/dist/icons/plus.svelte";
function Plus($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  $$renderer.component(
    ($$renderer2) => {
      /**
       * @license lucide-svelte v0.468.0 - ISC
       *
       * This source code is licensed under the ISC license.
       * See the LICENSE file in the root directory of this source tree.
       */
      const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]];
      Icon($$renderer2, spread_props([
        { name: "plus" },
        $$sanitized_props,
        {
          /**
           * @component @name Plus
           * @description Lucide SVG icon component, renders SVG Element with children.
           *
           * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KICA8cGF0aCBkPSJNMTIgNXYxNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/plus
           * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
           *
           * @param {Object} props - Lucide icons props and any valid SVG attribute
           * @returns {FunctionalComponent} Svelte component
           *
           */
          iconNode,
          children: prevent_snippet_stringification(($$renderer3) => {
            $$renderer3.push(`<!--[-->`);
            slot($$renderer3, $$props, "default", {});
            $$renderer3.push(`<!--]-->`);
          }),
          $$slots: { default: true }
        }
      ]));
    },
    Plus
  );
}
Plus.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
_page[FILENAME] = "src/routes/projects/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      $$renderer2.push(`<div class="space-y-6">`);
      push_element($$renderer2, "div", 64, 0);
      $$renderer2.push(`<div class="flex items-center justify-between">`);
      push_element($$renderer2, "div", 66, 1);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 67, 2);
      $$renderer2.push(`<h1 class="text-2xl font-bold text-[var(--text)]">`);
      push_element($$renderer2, "h1", 68, 3);
      $$renderer2.push(`Projekte</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 69, 3);
      $$renderer2.push(`Verwalte deine Kanban-Boards</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <button class="btn btn-primary flex items-center gap-2">`);
      push_element($$renderer2, "button", 72, 2);
      Plus($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> Neues Projekt</button>`);
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
        push_element($$renderer2, "div", 90, 2);
        $$renderer2.push(`<svg class="animate-spin h-8 w-8 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">`);
        push_element($$renderer2, "svg", 91, 3);
        $$renderer2.push(`<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">`);
        push_element($$renderer2, "circle", 92, 4);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">`);
        push_element($$renderer2, "path", 93, 4);
        $$renderer2.push(`</path>`);
        pop_element();
        $$renderer2.push(`</svg>`);
        pop_element();
        $$renderer2.push(`</div>`);
        pop_element();
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
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
