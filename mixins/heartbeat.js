export default {
  data() {
    return {
      interval: undefined
    }
  },
  methods: {
    startHeartbeat() {
      clearInterval(this.interval)
      this.interval = setInterval(function() {
        // eslint-disable-next-line no-console
        this.$nuxt.$store.dispatch('sendMessage', 'ping')
      }, 5000)
    },
    stopHeartbeat() {
      clearInterval(this.interval)
    }
  }
}
