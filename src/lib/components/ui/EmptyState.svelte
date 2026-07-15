<script lang="ts">
	// Wiederverwendbarer leerer Zustand für Listen ohne Einträge.
	export let icon: string = '¯\\_(ツ)_/¯';
	export let message: string = '…nüscht';
</script>

<div class="flex flex-col items-center justify-center py-24 text-center">
	<p class="text-lg" style="color: var(--color-text-secondary);">{icon}</p>
	<p class="text-sm mt-2" style="color: var(--color-text-secondary);">{message}</p>
	<slot />
</div>
