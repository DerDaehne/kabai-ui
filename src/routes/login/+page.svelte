<script lang="ts">
	import { goto } from '$app/navigation';
	import { z } from 'zod';
	import Spinner from '$components/ui/Spinner.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Form State
	let username = '';
	let password = '';
	let error = '';
	let isLoading = false;

	// DB-Verbindungsinfo vom Server
	let dbHost = data.dbHost;
	let dbPort = data.dbPort;
	let dbName = data.dbName;
	
	// Validierung
	const loginSchema = z.object({
		username: z.string().min(1, 'Username ist erforderlich'),
		password: z.string().min(1, 'Password ist erforderlich')
	});
	
	// Login Funktion
	async function handleLogin(event: Event) {
		event.preventDefault();
		try {
			// Client-seitige Validierung
			const validation = loginSchema.safeParse({ username, password });
			if (!validation.success) {
				error = validation.error.errors[0].message;
				return;
			}
			
			error = '';
			isLoading = true;
			
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
			
			const result = await response.json();
			
			if (!result.ok) {
				error = result.error || 'Login fehlgeschlagen';
				isLoading = false;
				return;
			}
			
			// Erfolgreich - zur Projektübersicht weiterleiten
			goto('/');
		} catch (err) {
			error = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.';
			console.error('Login error:', err);
		} finally {
			isLoading = false;
		}
	}
	
</script>

<div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg);">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-8">
			<div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style="background: var(--primary);">
				<svg class="w-10 h-10" style="color: #fff;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
			</div>
			<h1 class="text-2xl font-bold" style="color: var(--text);">Kabai UI</h1>
			<p class="mt-1" style="color: var(--text-muted);">Kanban Client für kabai</p>
		</div>

		<!-- Login Card -->
		<div class="card p-8">
			<h2 class="text-xl font-semibold mb-6" style="color: var(--text);">Anmelden</h2>

			<!-- Verbindung_info -->
			<div class="mb-6 p-3 rounded-lg" style="background: var(--border);">
				<p class="text-sm" style="color: var(--text-muted);">
					Verbindung zu: <span class="font-mono font-medium" style="color: var(--text);">{dbHost}:{dbPort}/{dbName}</span>
				</p>
			</div>
			
			<!-- Form -->
			<form onsubmit={handleLogin}>
				<div class="space-y-4">
					<!-- Username -->
					<div>
						<label class="label" for="username">PostgreSQL Username</label>
						<input
							id="username"
							type="text"
							bind:value={username}
							class="input"
							placeholder="Ihr PostgreSQL Benutzername"
							autocomplete="username"
							required
						/>
					</div>
					
					<!-- Password -->
					<div>
						<label class="label" for="password">PostgreSQL Password</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							class="input"
							placeholder="Ihr PostgreSQL Passwort"
							autocomplete="current-password"
							required
						/>
					</div>
					
					<!-- Error -->
					{#if error}
						<div class="p-3 rounded-md" style="background: color-mix(in srgb, var(--color-danger) 10%, transparent); border-left: 2px solid var(--color-danger);">
							<p class="text-sm" style="color: var(--danger);">{error}</p>
						</div>
					{/if}
					
					<!-- Submit Button -->
					<button
						type="submit"
						class="w-full btn btn-primary"
						disabled={isLoading || !username || !password}
					>
						{#if isLoading}
							<span class="flex items-center justify-center gap-2">
								<Spinner size={5} color="currentColor" thickness="border-2" />
								Anmelden...
							</span>
						{:else}
							Anmelden
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
