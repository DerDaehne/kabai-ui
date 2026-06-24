import { c as store_get, j as attr, e as escape_html, f as ensure_array_like, u as unsubscribe_stores, F as FILENAME } from "../../../../../../chunks/root.js";
import { p as push_element, a as pop_element } from "../../../../../../chunks/client.js";
import { z } from "zod";
import { A as Arrow_left } from "../../../../../../chunks/arrow-left.js";
_page[FILENAME] = "src/routes/projects/[id]/tickets/new/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      var $$store_subs;
      let title = "";
      let description = "";
      let status_id = null;
      let assignee = "";
      let statuses = [];
      const { id } = store_get($$store_subs ??= {}, "$props", props)();
      z.object({
        title: z.string().min(1, "Titel ist erforderlich"),
        description: z.string().optional(),
        status_id: z.number().int().min(1, "Status ist erforderlich"),
        assignee: z.string().optional()
      });
      $$renderer2.push(`<div class="max-w-2xl">`);
      push_element($$renderer2, "div", 102, 0);
      $$renderer2.push(`<div class="mb-6">`);
      push_element($$renderer2, "div", 104, 1);
      $$renderer2.push(`<button class="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-4">`);
      push_element($$renderer2, "button", 105, 2);
      Arrow_left($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----> Zurück zum Board</button>`);
      pop_element();
      $$renderer2.push(` <h1 class="text-2xl font-bold text-[var(--text)]">`);
      push_element($$renderer2, "h1", 113, 2);
      $$renderer2.push(`Neues Ticket</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 114, 2);
      $$renderer2.push(`Erstellen Sie ein neues Ticket</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div class="card p-6">`);
      push_element($$renderer2, "div", 118, 1);
      $$renderer2.push(`<form class="space-y-4">`);
      push_element($$renderer2, "form", 119, 2);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 121, 3);
      $$renderer2.push(`<label class="label" for="title">`);
      push_element($$renderer2, "label", 122, 4);
      $$renderer2.push(`Titel *</label>`);
      pop_element();
      $$renderer2.push(` <input id="title" type="text"${attr("value", title)} class="input" placeholder="z.B. Login-Formular reparieren, API-Dokumentation aktualisieren" required=""/>`);
      push_element($$renderer2, "input", 123, 4);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 134, 3);
      $$renderer2.push(`<label class="label" for="description">`);
      push_element($$renderer2, "label", 135, 4);
      $$renderer2.push(`Beschreibung</label>`);
      pop_element();
      $$renderer2.push(` <textarea id="description" class="input min-h-[100px] resize-vertical" placeholder="Beschreiben Sie das Ticket...">`);
      push_element($$renderer2, "textarea", 136, 4);
      const $$body = escape_html(description);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 145, 3);
      $$renderer2.push(`<label class="label" for="status_id">`);
      push_element($$renderer2, "label", 146, 4);
      $$renderer2.push(`Status *</label>`);
      pop_element();
      $$renderer2.push(` `);
      $$renderer2.select(
        {
          id: "status_id",
          value: status_id,
          class: "input",
          required: true
        },
        ($$renderer3) => {
          if (statuses.length === 0) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.option({ value: "", disabled: true }, ($$renderer4) => {
              push_element($$renderer4, "option", 154, 6);
              $$renderer4.push(`Keine Statuses verfügbar`);
              pop_element();
            });
          } else {
            $$renderer3.push("<!--[-1-->");
            $$renderer3.push(`<!--[-->`);
            const each_array = ensure_array_like(statuses);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let status = each_array[$$index];
              $$renderer3.option({ value: status.id }, ($$renderer4) => {
                push_element($$renderer4, "option", 157, 7);
                $$renderer4.push(`${escape_html(status.display_name)} (${escape_html(status.name)})`);
                pop_element();
              });
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        }
      );
      $$renderer2.push(` <p class="text-xs text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 163, 4);
      $$renderer2.push(`Wählen Sie den Anfangs-Status für das Ticket.</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 169, 3);
      $$renderer2.push(`<label class="label" for="assignee">`);
      push_element($$renderer2, "label", 170, 4);
      $$renderer2.push(`Zugewiesen an</label>`);
      pop_element();
      $$renderer2.push(` <input id="assignee" type="text"${attr("value", assignee)} class="input" placeholder="Name des Verantwortlichen"/>`);
      push_element($$renderer2, "input", 171, 4);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="flex gap-3 pt-4">`);
      push_element($$renderer2, "div", 188, 3);
      $$renderer2.push(`<button type="button" class="btn btn-ghost">`);
      push_element($$renderer2, "button", 189, 4);
      $$renderer2.push(`Abbrechen</button>`);
      pop_element();
      $$renderer2.push(` <button type="submit" class="btn btn-primary flex-1"${attr("disabled", statuses.length === 0, true)}>`);
      push_element($$renderer2, "button", 196, 4);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`Ticket erstellen`);
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
