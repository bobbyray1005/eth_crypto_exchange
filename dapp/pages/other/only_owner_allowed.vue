<template>
  <v-layout align-center justify-center>
    <v-flex xs12 sm8 md6 ma-5 style="max-width: 700px">
      <v-card elevation="0" class="pa-5">
        <p class="headline pa-5 error white--text">
          Make sure you connect with Metamask using the owner account
        </p>

        <v-btn class="ma-5 success" to="/admin">Back to admin dashboard</v-btn>
      </v-card>
    </v-flex>
  </v-layout>
</template>
<script>
export default {
  auth: false,
  data: () => ({
    variable: null,
  }),
  mounted() {},
}
</script>
