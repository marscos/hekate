<script lang="ts">
	import triplemoon from '$lib/assets/triplemoon.svg'
	import { MenuIcon } from 'lucide-svelte'
</script>

<nav
	class="border-secondary-500 flex h-8 w-screen flex-row items-center border-b p-1 sm:justify-start"
>
	<MenuIcon class="block sm:hidden"></MenuIcon>
	<img src={triplemoon} alt="Hekate" class="ml-auto mr-auto h-full" />
</nav>
