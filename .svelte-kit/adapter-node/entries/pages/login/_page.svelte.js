import { e as escape_html, j as attr, F as FILENAME } from "../../../chunks/root.js";
import { p as push_element, a as pop_element } from "../../../chunks/client.js";
import { z } from "zod";
_page[FILENAME] = "src/routes/login/+page.svelte";
function _page($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let dbHost;
      let username = "";
      let password = "";
      dbPort = "5432";
      dbName = "kb_ai";
      z.object({
        username: z.string().min(1, "Username ist erforderlich"),
        password: z.string().min(1, "Password ist erforderlich")
      });
      dbHost = "localhost";
      $$renderer2.push(`<div class="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">`);
      push_element($$renderer2, "div", 70, 0);
      $$renderer2.push(`<div class="w-full max-w-md">`);
      push_element($$renderer2, "div", 71, 1);
      $$renderer2.push(`<div class="text-center mb-8">`);
      push_element($$renderer2, "div", 73, 2);
      $$renderer2.push(`<div class="w-16 h-16 bg-[var(--primary)] rounded-2xl flex items-center justify-center mx-auto mb-4">`);
      push_element($$renderer2, "div", 74, 3);
      $$renderer2.push(`<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">`);
      push_element($$renderer2, "svg", 75, 4);
      $$renderer2.push(`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">`);
      push_element($$renderer2, "path", 76, 5);
      $$renderer2.push(`</path>`);
      pop_element();
      $$renderer2.push(`</svg>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <h1 class="text-2xl font-bold text-[var(--text)]">`);
      push_element($$renderer2, "h1", 80, 3);
      $$renderer2.push(`kbai-ui</h1>`);
      pop_element();
      $$renderer2.push(` <p class="text-[var(--text-muted)] mt-1">`);
      push_element($$renderer2, "p", 81, 3);
      $$renderer2.push(`Kanban Client für kb.ai</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div class="card p-8">`);
      push_element($$renderer2, "div", 85, 2);
      $$renderer2.push(`<h2 class="text-xl font-semibold text-[var(--text)] mb-6">`);
      push_element($$renderer2, "h2", 86, 3);
      $$renderer2.push(`Anmelden</h2>`);
      pop_element();
      $$renderer2.push(` <div class="mb-6 p-3 bg-[var(--border)] rounded-lg">`);
      push_element($$renderer2, "div", 89, 3);
      $$renderer2.push(`<p class="text-sm text-[var(--text-muted)]">`);
      push_element($$renderer2, "p", 90, 4);
      $$renderer2.push(`Verbindung zu: <span class="font-mono font-medium text-[var(--text)]">`);
      push_element($$renderer2, "span", 91, 20);
      $$renderer2.push(`${escape_html(dbHost)}:${escape_html(dbPort)}/${escape_html(dbName)}</span>`);
      pop_element();
      $$renderer2.push(`</p>`);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <form>`);
      push_element($$renderer2, "form", 96, 3);
      $$renderer2.push(`<div class="space-y-4">`);
      push_element($$renderer2, "div", 97, 4);
      $$renderer2.push(`<div>`);
      push_element($$renderer2, "div", 99, 5);
      $$renderer2.push(`<label class="label" for="username">`);
      push_element($$renderer2, "label", 100, 6);
      $$renderer2.push(`PostgreSQL Username</label>`);
      pop_element();
      $$renderer2.push(` <input id="username" type="text"${attr("value", username)} class="input" placeholder="Ihr PostgreSQL Benutzername" autocomplete="username" required=""/>`);
      push_element($$renderer2, "input", 101, 6);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` <div>`);
      push_element($$renderer2, "div", 113, 5);
      $$renderer2.push(`<label class="label" for="password">`);
      push_element($$renderer2, "label", 114, 6);
      $$renderer2.push(`PostgreSQL Password</label>`);
      pop_element();
      $$renderer2.push(` <input id="password" type="password"${attr("value", password)} class="input" placeholder="Ihr PostgreSQL Passwort" autocomplete="current-password" required=""/>`);
      push_element($$renderer2, "input", 115, 6);
      pop_element();
      $$renderer2.push(`</div>`);
      pop_element();
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <button type="submit" class="w-full btn btn-primary"${attr("disabled", !username, true)}>`);
      push_element($$renderer2, "button", 134, 5);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`Anmelden`);
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
      $$renderer2.push(`</div>`);
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
