import Vue from 'vue'
import VueNativeSock from 'vue-native-websocket'

export default ({ store }, inject) => {
  inject('wsInitialize', () => {
    Vue.use(VueNativeSock, 'ws://localhost', {
      connectManually: true,
      protocol: 'v2',
      reconnection: false, // (Boolean) whether to reconnect automatically (false)
      reconnectionAttempts: 20, // (Number) number of reconnection attempts before giving up (Infinity),
      reconnectionDelay: 4000,
      timeout: 10000,
      store,
      passToStoreHandler(eventName, event) {
        if (!eventName.startsWith('SOCKET_')) {
          return
        }
        let method = 'commit'
        let target = eventName.toUpperCase()
        if (target === 'SOCKET_ONMESSAGE') {
          method = 'dispatch'
          target = 'parseMessage'
        }
        let msg = event
        if (this.format === 'json' && event.data) {
          msg = JSON.parse(event.data)
          if (msg.mutation) {
            target = [msg.namespace || '', msg.mutation]
              .filter((e) => !!e)
              .join('/')
          } else if (msg.action) {
            method = 'dispatch'
            target = [msg.namespace || '', msg.action]
              .filter((e) => !!e)
              .join('/')
          }
        }
        this.store[method](target, msg)
      },
    })
  })
  inject('wsConnect', (homeeid, token) => {
    const vm = new Vue()
    let connectString
    // Check if id
    if (homeeid.substr(0, 3) === '000') {
      connectString =
        'wss://' + homeeid + '.hom.ee/connection?access_token=' + token
    } else {
      return
    }
    vm.$connect(connectString)
  })
  inject('wsDisconnect', () => {
    const vm = new Vue()
    vm.$disconnect()
  })
}
