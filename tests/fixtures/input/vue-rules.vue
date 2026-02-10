<template>
  <!-- vue/no-unused-vars -->
  <div>
    <p>{{ usedVar }}</p>
  </div>
  
  <!-- vue/require-v-for-key -->
  <ul>
    <li v-for="item in items">{{ item }}</li>
  </ul>
  
  <!-- vue/no-duplicate-attributes -->
  <input type="text" v-model="value" v-model="value" />
</template>

<script>
export default {
  data() {
    return {
      usedVar: 'used',
      unusedVar: 'never used in template',
      items: [1, 2, 3],
      value: ''
    };
  },
  methods: {
    // vue/no-unused-components
    unusedMethod() {
      console.log('never called');
    }
  }
};
</script>

<style scoped>
/* Styles are not the focus of rule testing */
</style>
