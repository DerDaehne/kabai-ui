import { s as sanitize_props, a as spread_props, p as prevent_snippet_stringification, F as FILENAME, b as slot, c as store_get, u as unsubscribe_stores } from "../../../../chunks/root.js";
import { p as push_element, a as pop_element } from "../../../../chunks/client.js";
import { A as Arrow_left } from "../../../../chunks/arrow-left.js";
import { I as Icon } from "../../../../chunks/Icon.js";
List[FILENAME] = "node_modules/lucide-svelte/dist/icons/list.svelte";
function List($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  $$renderer.component(
    ($$renderer2) => {
      /**
       * @license lucide-svelte v0.468.0 - ISC
       *
       * This source code is licensed under the ISC license.
       * See the LICENSE file in the root directory of this source tree.
       */
      const iconNode = [
        ["path", { "d": "M3 12h.01" }],
        ["path", { "d": "M3 18h.01" }],
        ["path", { "d": "M3 6h.01" }],
        ["path", { "d": "M8 12h13" }],
        ["path", { "d": "M8 18h13" }],
        ["path", { "d": "M8 6h13" }]
      ];
      Icon($$renderer2, spread_props([
        { name: "list" },
        $$sanitized_props,
        {
          /**
           * @component @name List
           * @description Lucide SVG icon component, renders SVG Element with children.
           *
           * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyAxMmguMDEiIC8+CiAgPHBhdGggZD0iTTMgMThoLjAxIiAvPgogIDxwYXRoIGQ9Ik0zIDZoLjAxIiAvPgogIDxwYXRoIGQ9Ik04IDEyaDEzIiAvPgogIDxwYXRoIGQ9Ik04IDE4aDEzIiAvPgogIDxwYXRoIGQ9Ik04IDZoMTMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/list
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
    List
  );
}
List.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Network[FILENAME] = "node_modules/lucide-svelte/dist/icons/network.svelte";
function Network($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  $$renderer.component(
    ($$renderer2) => {
      /**
       * @license lucide-svelte v0.468.0 - ISC
       *
       * This source code is licensed under the ISC license.
       * See the LICENSE file in the root directory of this source tree.
       */
      const iconNode = [
        [
          "rect",
          { "x": "16", "y": "16", "width": "6", "height": "6", "rx": "1" }
        ],
        [
          "rect",
          { "x": "2", "y": "16", "width": "6", "height": "6", "rx": "1" }
        ],
        [
          "rect",
          { "x": "9", "y": "2", "width": "6", "height": "6", "rx": "1" }
        ],
        ["path", { "d": "M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" }],
        ["path", { "d": "M12 12V8" }]
      ];
      Icon($$renderer2, spread_props([
        { name: "network" },
        $$sanitized_props,
        {
          /**
           * @component @name Network
           * @description Lucide SVG icon component, renders SVG Element with children.
           *
           * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB4PSIxNiIgeT0iMTYiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIHJ4PSIxIiAvPgogIDxyZWN0IHg9IjIiIHk9IjE2IiB3aWR0aD0iNiIgaGVpZ2h0PSI2IiByeD0iMSIgLz4KICA8cmVjdCB4PSI5IiB5PSIyIiB3aWR0aD0iNiIgaGVpZ2h0PSI2IiByeD0iMSIgLz4KICA8cGF0aCBkPSJNNSAxNnYtM2ExIDEgMCAwIDEgMS0xaDEyYTEgMSAwIDAgMSAxIDF2MyIgLz4KICA8cGF0aCBkPSJNMTIgMTJWOCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/network
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
    Network
  );
}
Network.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Settings[FILENAME] = "node_modules/lucide-svelte/dist/icons/settings.svelte";
function Settings($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  $$renderer.component(
    ($$renderer2) => {
      /**
       * @license lucide-svelte v0.468.0 - ISC
       *
       * This source code is licensed under the ISC license.
       * See the LICENSE file in the root directory of this source tree.
       */
      const iconNode = [
        [
          "path",
          {
            "d": "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          }
        ],
        ["circle", { "cx": "12", "cy": "12", "r": "3" }]
      ];
      Icon($$renderer2, spread_props([
        { name: "settings" },
        $$sanitized_props,
        {
          /**
           * @component @name Settings
           * @description Lucide SVG icon component, renders SVG Element with children.
           *
           * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIuMjIgMmgtLjQ0YTIgMiAwIDAgMC0yIDJ2LjE4YTIgMiAwIDAgMS0xIDEuNzNsLS40My4yNWEyIDIgMCAwIDEtMiAwbC0uMTUtLjA4YTIgMiAwIDAgMC0yLjczLjczbC0uMjIuMzhhMiAyIDAgMCAwIC43MyAyLjczbC4xNS4xYTIgMiAwIDAgMSAxIDEuNzJ2LjUxYTIgMiAwIDAgMS0xIDEuNzRsLS4xNS4wOWEyIDIgMCAwIDAtLjczIDIuNzNsLjIyLjM4YTIgMiAwIDAgMCAyLjczLjczbC4xNS0uMDhhMiAyIDAgMCAxIDIgMGwuNDMuMjVhMiAyIDAgMCAxIDEgMS43M1YyMGEyIDIgMCAwIDAgMiAyaC40NGEyIDIgMCAwIDAgMi0ydi0uMThhMiAyIDAgMCAxIDEtMS43M2wuNDMtLjI1YTIgMiAwIDAgMSAyIDBsLjE1LjA4YTIgMiAwIDAgMCAyLjczLS43M2wuMjItLjM5YTIgMiAwIDAgMC0uNzMtMi43M2wtLjE1LS4wOGEyIDIgMCAwIDEtMS0xLjc0di0uNWEyIDIgMCAwIDEgMS0xLjc0bC4xNS0uMDlhMiAyIDAgMCAwIC43My0yLjczbC0uMjItLjM4YTIgMiAwIDAgMC0yLjczLS43M2wtLjE1LjA4YTIgMiAwIDAgMS0yIDBsLS40My0uMjVhMiAyIDAgMCAxLTEtMS43M1Y0YTIgMiAwIDAgMC0yLTJ6IiAvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/settings
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
    Settings
  );
}
Settings.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
_page[FILENAME] = "src/routes/projects/[id]/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      const { id } = store_get($$store_subs ??= {}, "$props", props)();
      $$renderer2.push(`<div class="space-y-6">`);
      push_element($$renderer2, "div", 64, 0);
      $$renderer2.push(`<div class="flex items-center justify-between">`);
      push_element($$renderer2, "div", 66, 1);
      $$renderer2.push(`<div class="flex items-center gap-4">`);
      push_element($$renderer2, "div", 67, 2);
      $$renderer2.push(`<button class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">`);
      push_element($$renderer2, "button", 68, 3);
      Arrow_left($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> Zurück</button>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
      pop_element();
      $$renderer2.push(` <div class="flex items-center gap-2">`);
      push_element($$renderer2, "div", 85, 2);
      $$renderer2.push(`<button class="btn btn-ghost flex items-center gap-2" title="Statuses verwalten">`);
      push_element($$renderer2, "button", 86, 3);
      List($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> <span class="hidden md:inline">`);
      push_element($$renderer2, "span", 92, 4);
      $$renderer2.push(`Statuses</span>`);
      pop_element();
      $$renderer2.push(`</button>`);
      pop_element();
      $$renderer2.push(` <button class="btn btn-ghost flex items-center gap-2" title="Workflow bearbeiten">`);
      push_element($$renderer2, "button", 94, 3);
      Network($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> <span class="hidden md:inline">`);
      push_element($$renderer2, "span", 100, 4);
      $$renderer2.push(`Workflow</span>`);
      pop_element();
      $$renderer2.push(`</button>`);
      pop_element();
      $$renderer2.push(` <button class="btn btn-ghost flex items-center gap-2" title="Projekt-Einstellungen">`);
      push_element($$renderer2, "button", 102, 3);
      Settings($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> <span class="hidden md:inline">`);
      push_element($$renderer2, "span", 108, 4);
      $$renderer2.push(`Einstellungen</span>`);
      pop_element();
      $$renderer2.push(`</button>`);
      pop_element();
      $$renderer2.push(`</div>`);
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
        $$renderer2.push(`<div class="flex items-center justify-center py-12">`);
        push_element($$renderer2, "div", 122, 2);
        $$renderer2.push(`<svg class="animate-spin h-10 w-10 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">`);
        push_element($$renderer2, "svg", 123, 3);
        $$renderer2.push(`<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">`);
        push_element($$renderer2, "circle", 124, 4);
        $$renderer2.push(`</circle>`);
        pop_element();
        $$renderer2.push(`<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">`);
        push_element($$renderer2, "path", 125, 4);
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
