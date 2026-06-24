import { X as sanitize_props, a3 as rest_props, a4 as fallback, a5 as attributes, a6 as clsx, O as ensure_array_like, a7 as validate_dynamic_element_tag, a8 as element, L as slot, Q as bind_props, _ as FILENAME } from './exports-Css8F_Cx.js';
import { p as push_element, a as pop_element } from './client-J9yR4JjB.js';

/**
 * @license lucide-svelte v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
Icon[FILENAME] = "node_modules/lucide-svelte/dist/Icon.svelte";
function Icon($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "name",
    "color",
    "size",
    "strokeWidth",
    "absoluteStrokeWidth",
    "iconNode"
  ]);
  $$renderer.component(
    ($$renderer2) => {
      let name = fallback($$props["name"], void 0);
      let color = fallback($$props["color"], "currentColor");
      let size = fallback($$props["size"], 24);
      let strokeWidth = fallback($$props["strokeWidth"], 2);
      let absoluteStrokeWidth = fallback($$props["absoluteStrokeWidth"], false);
      let iconNode = fallback($$props["iconNode"], () => [], true);
      const mergeClasses = (...classes) => classes.filter((className, index, array) => {
        return Boolean(className) && array.indexOf(className) === index;
      }).join(" ");
      $$renderer2.push(`<svg${attributes(
        {
          ...defaultAttributes,
          ...$$restProps,
          width: size,
          height: size,
          stroke: color,
          "stroke-width": absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
          class: clsx(mergeClasses("lucide-icon", "lucide", name ? `lucide-${name}` : "", $$sanitized_props.class))
        },
        void 0,
        void 0,
        void 0,
        3
      )}>`);
      push_element($$renderer2, "svg", 14, 0);
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(iconNode);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let [tag, attrs] = each_array[$$index];
        validate_dynamic_element_tag(() => tag);
        push_element($$renderer2, tag, 35, 4);
        element($$renderer2, tag, () => {
          $$renderer2.push(`${attributes({ ...attrs }, void 0, void 0, void 0, 3)}`);
        });
        pop_element();
      }
      $$renderer2.push(`<!--]--><!--[-->`);
      slot($$renderer2, $$props, "default", {});
      $$renderer2.push(`<!--]--></svg>`);
      pop_element();
      bind_props($$props, {
        name,
        color,
        size,
        strokeWidth,
        absoluteStrokeWidth,
        iconNode
      });
    },
    Icon
  );
}
Icon.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};

export { Icon as I };
//# sourceMappingURL=Icon-C38XhIjg.js.map
