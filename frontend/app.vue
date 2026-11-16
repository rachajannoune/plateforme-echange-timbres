<script setup lang="ts">

const { data, pending, error } = await useFetch("/api/timbres");

</script>

<template>
    <div>
        <h1>Philatélio — Frontend Nuxt 3</h1>

        <p v-if="pending">Chargement des timbres...</p>

        <p v-else-if="error">Erreur de connexion au backend.</p>

        <div v-else>
            <p>Connexion au backend réussie !</p>

            <p>Nombre total de timbres : {{ data?.total }}</p>
        </div>
    </div>
</template>