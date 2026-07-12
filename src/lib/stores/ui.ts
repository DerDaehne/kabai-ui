import { writable } from 'svelte/store';

// Steuert die Sichtbarkeit der rechten AI-Aktivität-Rail im App-Layout.
export const railOpen = writable(false);
