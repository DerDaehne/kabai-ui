<script lang="ts">
	// Ticket #510: Der repo-weit ~34x kopierte Lade-Spinner als Komponente.
	// Zwei Varianten kommen im Repo vor:
	//  - "Seiten-Spinner": großer Ring (w-8..w-12), rotierender Rand in Primary-/Accent-Farbe
	//  - "Inline-Spinner": kleiner Ring (w-3..w-4) in Buttons, meist "border-current"
	//    oder eine feste Kontrastfarbe (z.B. schwarz auf Primary-Buttons).
	// size ist eine Tailwind-Zahl (w-{size} h-{size}), Default passend zum großen
	// Seiten-Spinner (w-10), da dieser am häufigsten vorkommt.
	export let size: number = 10;
	// Farbe des rotierenden Randes. "currentColor" ergibt border-current (Inline-
	// Spinner in Buttons erben dann die Textfarbe des Buttons).
	export let color: string = 'var(--primary)';
	// Dicke des Randes — die kleinen Inline-Spinner nutzen teils border (1px)
	// statt border-2.
	export let thickness: 'border' | 'border-2' = 'border-2';
</script>

<div class="relative" style="width: {size * 0.25}rem; height: {size * 0.25}rem;">
	<div
		class="absolute inset-0 rounded-full border-transparent animate-spin {thickness}"
		style="border-top-color: {color};"
	></div>
</div>
