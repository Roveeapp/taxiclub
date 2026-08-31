<template>
  <div class="min-h-screen" style="background: var(--surface)">
    <AppHeader />
    <main class="mx-auto max-w-mobile px-md pb-24">
      <slot />
    </main>
    <BottomNav />

    <!-- Diálogo de confirmación compartido: sustituye a confirm() del navegador -->
    <AppConfirmDialog
      :abierto="confirmacion.abierto"
      :titulo="confirmacion.titulo"
      :mensaje="confirmacion.mensaje"
      :texto-confirmar="confirmacion.textoConfirmar"
      :texto-cancelar="confirmacion.textoCancelar"
      :destructivo="confirmacion.destructivo"
      :palabra-clave="confirmacion.palabraClave"
      @confirmar="responderConfirmacion(true)"
      @cancelar="responderConfirmacion(false)"
    />
  </div>
</template>

<script setup lang="ts">
const { estado: confirmacion, responder: responderConfirmacion } = useConfirmacion()
</script>
