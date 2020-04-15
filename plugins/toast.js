import Vue from 'vue'
import VuetifyToast from 'vuetify-toast-snackbar'

Vue.use(VuetifyToast, {
  x: 'middle',
  showClose: true,
  closeColor: 'white',
  closeIcon: 'mdi-close',
})
