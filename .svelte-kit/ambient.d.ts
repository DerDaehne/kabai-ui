
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const KBAI_DB_HOST: string;
	export const KBAI_DB_PORT: string;
	export const KBAI_DB_NAME: string;
	export const KBAI_SESSION_SECRET: string;
	export const KBAI_SESSION_TTL_MINUTES: string;
	export const PORT: string;
	export const NODE_ENV: string;
	export const SHELL: string;
	export const npm_command: string;
	export const SESSION_MANAGER: string;
	export const VST3_PATH: string;
	export const __ETC_PROFILE_DONE: string;
	export const npm_config_userconfig: string;
	export const COLORTERM: string;
	export const XDG_CONFIG_DIRS: string;
	export const npm_config_cache: string;
	export const PROTON_ENABLE_NVAPI: string;
	export const KGLOBALACCELD_PLATFORM: string;
	export const XDG_SESSION_PATH: string;
	export const NIX_BUILD_CORES: string;
	export const NIX_GCROOT: string;
	export const XDG_MENU_PREFIX: string;
	export const WLR_NO_HARDWARE_CURSORS: string;
	export const configureFlags: string;
	export const NIXPKGS_ALLOW_UNFREE: string;
	export const mesonFlags: string;
	export const LAST_EXIT_CODE: string;
	export const ICEAUTHORITY: string;
	export const LANGUAGE: string;
	export const shell: string;
	export const depsHostHost: string;
	export const NODE: string;
	export const LC_ADDRESS: string;
	export const SYSTEMD_XKB_DIRECTORY: string;
	export const LC_NAME: string;
	export const STRINGS: string;
	export const depsTargetTarget: string;
	export const XCURSOR_PATH: string;
	export const MEMORY_PRESSURE_WRITE: string;
	export const PROMPT_MULTILINE_INDICATOR: string;
	export const stdenv: string;
	export const COLOR: string;
	export const OPENAI_API_KEY: string;
	export const LOCALE_ARCHIVE_2_27: string;
	export const npm_config_local_prefix: string;
	export const builder: string;
	export const LIBVA_DRIVER_NAME: string;
	export const GNUPGHOME: string;
	export const PROMPT_INDICATOR_VI_INSERT: string;
	export const DESKTOP_SESSION: string;
	export const LC_MONETARY: string;
	export const GDK_PIXBUF_MODULE_FILE: string;
	export const ELECTRON_OZONE_PLATFORM_HINT: string;
	export const KITTY_PID: string;
	export const GTK_RC_FILES: string;
	export const shellHook: string;
	export const npm_config_globalconfig: string;
	export const GPG_TTY: string;
	export const EDITOR: string;
	export const phases: string;
	export const XDG_SEAT: string;
	export const PWD: string;
	export const NIX_PROFILES: string;
	export const SOURCE_DATE_EPOCH: string;
	export const LOGNAME: string;
	export const XDG_SESSION_DESKTOP: string;
	export const XDG_SESSION_TYPE: string;
	export const NIX_ENFORCE_NO_NATIVE: string;
	export const CUPS_DATADIR: string;
	export const NIX_PATH: string;
	export const npm_config_init_module: string;
	export const SYSTEMD_EXEC_PID: string;
	export const NIXPKGS_CONFIG: string;
	export const CXX: string;
	export const _: string;
	export const XAUTHORITY: string;
	export const CMD_DURATION_MS: string;
	export const TEMPDIR: string;
	export const KITTY_PUBLIC_KEY: string;
	export const system: string;
	export const TRANSIENT_PROMPT_MULTILINE_INDICATOR: string;
	export const HOST_PATH: string;
	export const QT_STYLE_OVERRIDE: string;
	export const XKB_DEFAULT_MODEL: string;
	export const GTK2_RC_FILES: string;
	export const IN_NIX_SHELL: string;
	export const NIXPKGS_QT6_QML_IMPORT_PATH: string;
	export const doInstallCheck: string;
	export const HOME: string;
	export const NIX_BINTOOLS: string;
	export const SSH_ASKPASS: string;
	export const LANG: string;
	export const LC_PAPER: string;
	export const VST_PATH: string;
	export const _JAVA_AWT_WM_NONREPARENTING: string;
	export const LS_COLORS: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const depsTargetTargetPropagated: string;
	export const npm_package_version: string;
	export const MEMORY_PRESSURE_WATCH: string;
	export const WAYLAND_DISPLAY: string;
	export const cmakeFlags: string;
	export const GIO_EXTRA_MODULES: string;
	export const outputs: string;
	export const KITTY_WINDOW_ID: string;
	export const NIX_STORE: string;
	export const TMPDIR: string;
	export const XDG_SEAT_PATH: string;
	export const LD: string;
	export const INVOCATION_ID: string;
	export const buildPhase: string;
	export const MANAGERPID: string;
	export const INIT_CWD: string;
	export const READELF: string;
	export const KDE_SESSION_UID: string;
	export const EGL_PLATFORM: string;
	export const NIX_USER_PROFILE_DIR: string;
	export const INFOPATH: string;
	export const npm_lifecycle_script: string;
	export const doCheck: string;
	export const XKB_DEFAULT_LAYOUT: string;
	export const NVD_BACKEND: string;
	export const npm_config_npm_version: string;
	export const depsBuildBuild: string;
	export const XDG_SESSION_CLASS: string;
	export const API_BASE_URL: string;
	export const LC_IDENTIFICATION: string;
	export const TERM: string;
	export const TERMINFO: string;
	export const npm_package_name: string;
	export const DEFAULT_MODEL: string;
	export const GTK_PATH: string;
	export const PROMPT_INDICATOR_VI_NORMAL: string;
	export const SIZE: string;
	export const propagatedNativeBuildInputs: string;
	export const npm_config_prefix: string;
	export const USER: string;
	export const strictDeps: string;
	export const PROMPT_INDICATOR: string;
	export const TZDIR: string;
	export const QT_WAYLAND_RECONNECT: string;
	export const AR: string;
	export const KDE_SESSION_VERSION: string;
	export const AS: string;
	export const PAM_KWALLET5_LOGIN: string;
	export const TEMP: string;
	export const DISPLAY: string;
	export const NIX_BINTOOLS_WRAPPER_TARGET_HOST_x86_64_unknown_linux_gnu: string;
	export const npm_lifecycle_event: string;
	export const SHLVL: string;
	export const NIX_BUILD_TOP: string;
	export const NM: string;
	export const PAGER: string;
	export const NIX_CFLAGS_COMPILE: string;
	export const LC_TELEPHONE: string;
	export const QTWEBKIT_PLUGIN_PATH: string;
	export const patches: string;
	export const LC_MEASUREMENT: string;
	export const __NIXOS_SET_ENVIRONMENT_DONE: string;
	export const XDG_VTNR: string;
	export const buildInputs: string;
	export const TRANSIENT_PROMPT_COMMAND_RIGHT: string;
	export const XDG_SESSION_ID: string;
	export const LOCALE_ARCHIVE: string;
	export const preferLocalBuild: string;
	export const MANAGERPIDFDID: string;
	export const LESSKEYIN_SYSTEM: string;
	export const npm_config_user_agent: string;
	export const QML2_IMPORT_PATH: string;
	export const TERMINFO_DIRS: string;
	export const npm_execpath: string;
	export const LD_LIBRARY_PATH: string;
	export const XDG_RUNTIME_DIR: string;
	export const NODE_PATH: string;
	export const depsBuildTarget: string;
	export const OBJCOPY: string;
	export const NIX_XDG_DESKTOP_PORTAL_DIR: string;
	export const out: string;
	export const npm_package_json: string;
	export const LC_TIME: string;
	export const NU_VERSION: string;
	export const XKB_DEFAULT_VARIANT: string;
	export const STRIP: string;
	export const JOURNAL_STREAM: string;
	export const XDG_DATA_DIRS: string;
	export const KDE_FULL_SESSION: string;
	export const LIBEXEC_PATH: string;
	export const TMP: string;
	export const OBJDUMP: string;
	export const npm_config_noproxy: string;
	export const PATH: string;
	export const propagatedBuildInputs: string;
	export const __GLX_VENDOR_LIBRARY_NAME: string;
	export const npm_config_node_gyp: string;
	export const dontAddDisableDepTrack: string;
	export const REQUEST_TIMEOUT: string;
	export const CC: string;
	export const NIX_CC: string;
	export const GBM_BACKEND: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const depsBuildTargetPropagated: string;
	export const depsBuildBuildPropagated: string;
	export const npm_config_global_prefix: string;
	export const PASSWORD_STORE_DIR: string;
	export const KDE_APPLICATIONS_AS_SCOPE: string;
	export const NIX_CC_WRAPPER_TARGET_HOST_x86_64_unknown_linux_gnu: string;
	export const KPACKAGE_DEP_RESOLVERS_PATH: string;
	export const QT_PLUGIN_PATH: string;
	export const NODE_VERSION: string;
	export const CONFIG_SHELL: string;
	export const KITTY_INSTALLATION_DIR: string;
	export const XKB_DEFAULT_OPTIONS: string;
	export const __structuredAttrs: string;
	export const npm_node_execpath: string;
	export const RANLIB: string;
	export const NIX_HARDENING_ENABLE: string;
	export const LC_NUMERIC: string;
	export const NIX_LDFLAGS: string;
	export const nativeBuildInputs: string;
	export const name: string;
	export const npm_package_engines_node: string;
	export const depsHostHostPropagated: string;
	export const VITE_USER_NODE_ENV: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		KBAI_DB_HOST: string;
		KBAI_DB_PORT: string;
		KBAI_DB_NAME: string;
		KBAI_SESSION_SECRET: string;
		KBAI_SESSION_TTL_MINUTES: string;
		PORT: string;
		NODE_ENV: string;
		SHELL: string;
		npm_command: string;
		SESSION_MANAGER: string;
		VST3_PATH: string;
		__ETC_PROFILE_DONE: string;
		npm_config_userconfig: string;
		COLORTERM: string;
		XDG_CONFIG_DIRS: string;
		npm_config_cache: string;
		PROTON_ENABLE_NVAPI: string;
		KGLOBALACCELD_PLATFORM: string;
		XDG_SESSION_PATH: string;
		NIX_BUILD_CORES: string;
		NIX_GCROOT: string;
		XDG_MENU_PREFIX: string;
		WLR_NO_HARDWARE_CURSORS: string;
		configureFlags: string;
		NIXPKGS_ALLOW_UNFREE: string;
		mesonFlags: string;
		LAST_EXIT_CODE: string;
		ICEAUTHORITY: string;
		LANGUAGE: string;
		shell: string;
		depsHostHost: string;
		NODE: string;
		LC_ADDRESS: string;
		SYSTEMD_XKB_DIRECTORY: string;
		LC_NAME: string;
		STRINGS: string;
		depsTargetTarget: string;
		XCURSOR_PATH: string;
		MEMORY_PRESSURE_WRITE: string;
		PROMPT_MULTILINE_INDICATOR: string;
		stdenv: string;
		COLOR: string;
		OPENAI_API_KEY: string;
		LOCALE_ARCHIVE_2_27: string;
		npm_config_local_prefix: string;
		builder: string;
		LIBVA_DRIVER_NAME: string;
		GNUPGHOME: string;
		PROMPT_INDICATOR_VI_INSERT: string;
		DESKTOP_SESSION: string;
		LC_MONETARY: string;
		GDK_PIXBUF_MODULE_FILE: string;
		ELECTRON_OZONE_PLATFORM_HINT: string;
		KITTY_PID: string;
		GTK_RC_FILES: string;
		shellHook: string;
		npm_config_globalconfig: string;
		GPG_TTY: string;
		EDITOR: string;
		phases: string;
		XDG_SEAT: string;
		PWD: string;
		NIX_PROFILES: string;
		SOURCE_DATE_EPOCH: string;
		LOGNAME: string;
		XDG_SESSION_DESKTOP: string;
		XDG_SESSION_TYPE: string;
		NIX_ENFORCE_NO_NATIVE: string;
		CUPS_DATADIR: string;
		NIX_PATH: string;
		npm_config_init_module: string;
		SYSTEMD_EXEC_PID: string;
		NIXPKGS_CONFIG: string;
		CXX: string;
		_: string;
		XAUTHORITY: string;
		CMD_DURATION_MS: string;
		TEMPDIR: string;
		KITTY_PUBLIC_KEY: string;
		system: string;
		TRANSIENT_PROMPT_MULTILINE_INDICATOR: string;
		HOST_PATH: string;
		QT_STYLE_OVERRIDE: string;
		XKB_DEFAULT_MODEL: string;
		GTK2_RC_FILES: string;
		IN_NIX_SHELL: string;
		NIXPKGS_QT6_QML_IMPORT_PATH: string;
		doInstallCheck: string;
		HOME: string;
		NIX_BINTOOLS: string;
		SSH_ASKPASS: string;
		LANG: string;
		LC_PAPER: string;
		VST_PATH: string;
		_JAVA_AWT_WM_NONREPARENTING: string;
		LS_COLORS: string;
		XDG_CURRENT_DESKTOP: string;
		depsTargetTargetPropagated: string;
		npm_package_version: string;
		MEMORY_PRESSURE_WATCH: string;
		WAYLAND_DISPLAY: string;
		cmakeFlags: string;
		GIO_EXTRA_MODULES: string;
		outputs: string;
		KITTY_WINDOW_ID: string;
		NIX_STORE: string;
		TMPDIR: string;
		XDG_SEAT_PATH: string;
		LD: string;
		INVOCATION_ID: string;
		buildPhase: string;
		MANAGERPID: string;
		INIT_CWD: string;
		READELF: string;
		KDE_SESSION_UID: string;
		EGL_PLATFORM: string;
		NIX_USER_PROFILE_DIR: string;
		INFOPATH: string;
		npm_lifecycle_script: string;
		doCheck: string;
		XKB_DEFAULT_LAYOUT: string;
		NVD_BACKEND: string;
		npm_config_npm_version: string;
		depsBuildBuild: string;
		XDG_SESSION_CLASS: string;
		API_BASE_URL: string;
		LC_IDENTIFICATION: string;
		TERM: string;
		TERMINFO: string;
		npm_package_name: string;
		DEFAULT_MODEL: string;
		GTK_PATH: string;
		PROMPT_INDICATOR_VI_NORMAL: string;
		SIZE: string;
		propagatedNativeBuildInputs: string;
		npm_config_prefix: string;
		USER: string;
		strictDeps: string;
		PROMPT_INDICATOR: string;
		TZDIR: string;
		QT_WAYLAND_RECONNECT: string;
		AR: string;
		KDE_SESSION_VERSION: string;
		AS: string;
		PAM_KWALLET5_LOGIN: string;
		TEMP: string;
		DISPLAY: string;
		NIX_BINTOOLS_WRAPPER_TARGET_HOST_x86_64_unknown_linux_gnu: string;
		npm_lifecycle_event: string;
		SHLVL: string;
		NIX_BUILD_TOP: string;
		NM: string;
		PAGER: string;
		NIX_CFLAGS_COMPILE: string;
		LC_TELEPHONE: string;
		QTWEBKIT_PLUGIN_PATH: string;
		patches: string;
		LC_MEASUREMENT: string;
		__NIXOS_SET_ENVIRONMENT_DONE: string;
		XDG_VTNR: string;
		buildInputs: string;
		TRANSIENT_PROMPT_COMMAND_RIGHT: string;
		XDG_SESSION_ID: string;
		LOCALE_ARCHIVE: string;
		preferLocalBuild: string;
		MANAGERPIDFDID: string;
		LESSKEYIN_SYSTEM: string;
		npm_config_user_agent: string;
		QML2_IMPORT_PATH: string;
		TERMINFO_DIRS: string;
		npm_execpath: string;
		LD_LIBRARY_PATH: string;
		XDG_RUNTIME_DIR: string;
		NODE_PATH: string;
		depsBuildTarget: string;
		OBJCOPY: string;
		NIX_XDG_DESKTOP_PORTAL_DIR: string;
		out: string;
		npm_package_json: string;
		LC_TIME: string;
		NU_VERSION: string;
		XKB_DEFAULT_VARIANT: string;
		STRIP: string;
		JOURNAL_STREAM: string;
		XDG_DATA_DIRS: string;
		KDE_FULL_SESSION: string;
		LIBEXEC_PATH: string;
		TMP: string;
		OBJDUMP: string;
		npm_config_noproxy: string;
		PATH: string;
		propagatedBuildInputs: string;
		__GLX_VENDOR_LIBRARY_NAME: string;
		npm_config_node_gyp: string;
		dontAddDisableDepTrack: string;
		REQUEST_TIMEOUT: string;
		CC: string;
		NIX_CC: string;
		GBM_BACKEND: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		depsBuildTargetPropagated: string;
		depsBuildBuildPropagated: string;
		npm_config_global_prefix: string;
		PASSWORD_STORE_DIR: string;
		KDE_APPLICATIONS_AS_SCOPE: string;
		NIX_CC_WRAPPER_TARGET_HOST_x86_64_unknown_linux_gnu: string;
		KPACKAGE_DEP_RESOLVERS_PATH: string;
		QT_PLUGIN_PATH: string;
		NODE_VERSION: string;
		CONFIG_SHELL: string;
		KITTY_INSTALLATION_DIR: string;
		XKB_DEFAULT_OPTIONS: string;
		__structuredAttrs: string;
		npm_node_execpath: string;
		RANLIB: string;
		NIX_HARDENING_ENABLE: string;
		LC_NUMERIC: string;
		NIX_LDFLAGS: string;
		nativeBuildInputs: string;
		name: string;
		npm_package_engines_node: string;
		depsHostHostPropagated: string;
		VITE_USER_NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
