// Ticket #506 (Review): backdrop-filter macht ein Element per CSS-Spec zum
// Containing Block für position: fixed. Overlays (BottomSheet, BannerConfirm),
// die in Panel-gehosteten Komponenten gerendert werden, spannten sich dadurch
// nur über das SidePanel statt über den ganzen Viewport. Die Action hebt den
// Knoten beim Mounten ans document.body — fixed bezieht sich dann wieder auf
// den Viewport. Svelte-Transitions auf dem Knoten laufen normal weiter.
export function portal(node: HTMLElement) {
	document.body.appendChild(node);
	return {
		destroy() {
			node.parentNode?.removeChild(node);
		}
	};
}
