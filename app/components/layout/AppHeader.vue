<template>
  <header class="bg-background w-full top-0 sticky z-50">
    <div class="flex justify-between items-center px-md py-sm w-full max-w-mobile mx-auto">
      <Button
        icon="tabler:menu-2"
        severity="secondary"
        text
        rounded
        :pt="iconBtnPt"
        @click="toggleMenu"
      />
      <h1 class="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">CLUB TAXIS</h1>
      <NuxtLink to="/cuenta" class="flex items-center">
        <div v-if="user" class="w-8 h-8 rounded-full overflow-hidden border-2 border-secondary hover:opacity-80 active:scale-95 transition-all duration-200">
          <img
            v-if="user.user_metadata?.avatar_url"
            :src="user.user_metadata.avatar_url"
            :alt="user.email || 'Usuario'"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-secondary/20 flex items-center justify-center">
            <Icon name="tabler:user" size="16" class="text-secondary" />
          </div>
        </div>
        <Button
          v-else
          severity="secondary"
          text
          rounded
          :pt="iconBtnPt"
        >
          <BrandDot />
        </Button>
      </NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

const user = useSupabaseUser()

function toggleMenu() {
  // TODO: implementar menú lateral
}

const iconBtnPt = {
  root: { class: '!text-secondary hover:!opacity-80 !w-9 !h-9 !p-0' },
}
</script>
