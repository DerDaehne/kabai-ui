<script lang="ts">
	// Einmalige "Orbit"-Hervorhebung für Karten/Panels, die per KI-Event live
	// aktualisiert wurden: ein dünner cyanfarbener Lichtpunkt läuft genau einmal
	// in 900ms entlang der Border und blendet vollständig aus. Keine Wiederholung,
	// keine bleibende Hervorhebung (ersetzt die alte movedTicketIds/justUpdatedLive-
	// Border-Färbung).
	//
	// Technik: rotierender conic-gradient auf einem absolut positionierten
	// Overlay-Element, das per CSS mask auf einen dünnen Rand (Border) reduziert
	// wird. Das ist robuster als offset-path/inset-Animation (bessere Browser-
	// Unterstützung, kein Pfad-Parsing, funktioniert an abgerundeten Ecken) und
	// kommt ohne SVG aus.
	//
	// Trigger: `signal` ändert sich (Zähler oder Timestamp) -> Overlay wird für
	// ~950ms eingehängt, danach automatisch wieder entfernt.

	export let signal: number | string | null = null;
	export let radius = '0.75rem';

	let orbiting = false;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let lastSignal: typeof signal = null;

	$: if (signal !== null && signal !== lastSignal) {
		lastSignal = signal;
		orbiting = true;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => { orbiting = false; }, 950);
	}
</script>

{#if orbiting}
	<div class="orbit-highlight" style="border-radius: {radius};" aria-hidden="true"></div>
{/if}

<style>
	/* Animierbarer Gradient-Winkel: Es rotiert NUR der conic-gradient, nicht
	   das Element — ein transform: rotate würde die rechteckige Maske mitsamt
	   Ring aus der Kartenkontur kippen (Karten sind nicht quadratisch). */
	@property --orbit-angle {
		syntax: '<angle>';
		initial-value: 0deg;
		inherits: false;
	}

	.orbit-highlight {
		position: absolute;
		inset: 0;
		pointer-events: none;
		padding: 1.5px;
		/* Nur den Rand sichtbar machen: Gradient liegt hinter einer transparenten
		   Füllung, die per mask auf den 1.5px-Rahmen reduziert wird. */
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
		background: conic-gradient(
			from var(--orbit-angle),
			transparent 0%,
			transparent 88%,
			var(--primary, #00d9ff) 92%,
			#ffffff 94%,
			var(--primary, #00d9ff) 96%,
			transparent 100%
		);
		animation: orbit-spin 900ms ease-out forwards;
	}

	@keyframes orbit-spin {
		0% {
			--orbit-angle: 0deg;
			opacity: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			--orbit-angle: 360deg;
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.orbit-highlight {
			/* Keine Bewegung: stattdessen ein kurzes, dezentes Aufleuchten der
			   kompletten Border-Farbe (~600ms, dann zurück auf transparent). */
			background: var(--primary, #00d9ff);
			animation: orbit-fade 600ms ease-out forwards;
		}

		@keyframes orbit-fade {
			0% { opacity: 0.9; }
			100% { opacity: 0; }
		}
	}
</style>
