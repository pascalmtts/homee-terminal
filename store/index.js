import Vue from 'vue'
import CryptoJS from 'crypto-js'
import IsIP from 'is-ip'

export const state = () => ({
  homee: {
    id: '',
    token: '',
    userId: '',
    deviceId: '',
    isConnected: false,
    isConnecting: false,
    reconnectError: false,
    reconnecting: false,
  },
  savedLogins: [],
  messages: [],
})

export const mutations = {
  SOCKET_ONOPEN(state, event) {
    Vue.prototype.$socket = event.currentTarget
    state.homee.isConnected = true
    state.homee.reconnecting = false
  },
  SOCKET_ONCLOSE(state, event) {
    console.info(event)
    state.homee.isConnected = false
    switch (event.reason) {
      case 'SERVICE_RESTART':
        state.closeReason = 'SERVICE_RESTART'
        console.info('homee is restarting!')
        break
      case 'TOKEN_INVALID':
        state.homee.id = ''
        state.closeReason = 'TOKEN_INVALID'
        console.info('Token invalid!')
        break
      default:
        if (event.wasClean) {
          state.closeReason = 'CLEAN'
          console.info('Connection closed!')
        } else {
          state.closeReason = 'unknown'
          console.info('Connection lost!')
        }
        break
    }
  },
  SOCKET_ONERROR(state, event) {
    console.error(state, event)
  },
  // mutations for reconnect methods
  SOCKET_RECONNECT(state, count) {
    state.homee.reconnecting = true
    console.info('Reconnecting attempt ', count)
  },
  SOCKET_RECONNECT_ERROR(state) {
    console.info('Reconnecting failed!')
    state.homee.reconnectError = true
  },
  ADD_MESSAGE(state, message) {
    state.messages.push(message)
  },
  DELETE_MESSAGES(state) {
    state.messages = []
  },
  SET_TOKEN(state, token) {
    state.homee.token = token
  },
  SET_ID(state, id) {
    state.homee.id = id
  },
  SET_USERID(state, id) {
    state.homee.userId = id
  },
  SET_DEVICEID(state, id) {
    state.homee.deviceId = id
  },
  RESET_STATE(state) {
    state.homee.id = ''
    state.homee.token = ''
    state.homee.userId = ''
    state.homee.deviceId = ''
    state.connectData = {
      username: '',
      password: '',
    }
    state.messages = []
  },
  SET_CONNECTING(state, value) {
    state.homee.isConnecting = value
  },
  INITIALIZE_SAVED_LOGINS(state) {
    if (localStorage.getItem('savedLogins')) {
      state.savedLogins = JSON.parse(localStorage.getItem('savedLogins'))
    }
  },
  ADD_SAVED_LOGIN(state, login) {
    const index = state.savedLogins.findIndex((x) => x.id === login.id)
    if (index === -1) {
      state.savedLogins.push(login)
    }
  },
  REMOVE_SAVED_LOGIN(state, id) {
    const index = state.savedLogins.findIndex((x) => x.id === id)
    if (index !== -1) {
      state.savedLogins.splice(index, 1)
    }
  },
}

export const actions = {
  async getToken({ commit, state }, connectData) {
    // Search in Saved Logins
    if (state.savedLogins.findIndex((x) => x.id === connectData.id) !== -1) {
      const savedLogin = state.savedLogins.find(
        (savedLogin) => savedLogin.id === connectData.id
      )
      commit('SET_ID', savedLogin.id)
      commit('SET_TOKEN', savedLogin.token)
      commit('SET_USERID', savedLogin.user_id)
      commit('SET_DEVICEID', savedLogin.device_id)
      return
    }
    let connectString
    // Check if ip or id
    if (connectData.id.substr(0, 3) === '000') {
      connectString = 'https://' + connectData.id + '.hom.ee/access_token'
    } else if (IsIP(connectData.id)) {
      connectString = 'http://' + connectData.id + ':7681/access_token'
    } else {
      throw new Error('Invalid homee ID')
    }
    let passwordHash = CryptoJS.SHA512(connectData.password)
    passwordHash = passwordHash.toString(CryptoJS.enc.Hex)
    const authOptions = {
      method: 'POST',
      url: connectString,
      timeout: 4000,
      data:
        'device_hardware_id=123456&device_name=homee terminal&device_os=5&device_type=4',
      headers: {
        Authorization: `Basic ${btoa(
          connectData.username + ':' + passwordHash
        )}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
    try {
      const response = await this.$axios(authOptions)
      if (response.status === 200) {
        const responseArr = response.data.split('&')
        const responseParams = {}

        for (let q = 0, qArrLength = responseArr.length; q < qArrLength; q++) {
          const qArr = responseArr[q].split('=')
          responseParams[qArr[0]] = qArr[1]
        }
        commit('SET_ID', connectData.id)
        commit('SET_TOKEN', responseParams.access_token)
        commit('SET_USERID', responseParams.user_id)
        commit('SET_DEVICEID', responseParams.device_id)
        commit('ADD_SAVED_LOGIN', {
          id: state.homee.id,
          token: state.homee.token,
          user_id: responseParams.user_id,
          device_id: responseParams.device_id,
        })
      }
    } catch (e) {
      throw new Error('Could not get token')
    }
  },
  connect({ state }) {
    try {
      this.$wsConnect(state.homee.id, state.homee.token)
    } catch (e) {
      throw new Error(e)
    }
  },
  async authenticate({ commit, state, dispatch }, connectData) {
    if (state.homee.isConnected) {
      commit('RESET_STATE')
      dispatch('toggleConnection')
    }
    commit('SET_CONNECTING', true)
    try {
      await dispatch('getToken', connectData)
    } catch (e) {
      console.warn(e)
      commit('SET_CONNECTING', false)
      Vue.prototype.$toast('Verbindung nicht möglich', {
        color: 'error',
      })
      return
    }
    try {
      dispatch('connect')
    } catch (e) {
      console.error(e)
    }
  },
  disconnect({ state, commit, dispatch }) {
    dispatch(
      'sendMessage',
      'DELETE:users/' + state.homee.userId + '/devices/' + state.homee.deviceId
    )
    this.$wsDisconnect()
    commit('REMOVE_SAVED_LOGIN', state.homee.id)
    dispatch('clearData')
  },
  sendMessage({}, message) {
    Vue.prototype.$socket.send(message)
  },
  parseMessage({ commit, dispatch }, message) {
    if (message.data !== 'pong') {
      try {
        const data = JSON.parse(message.data)
        const today = new Date()
        const time =
          today.getHours() +
          ':' +
          today.getMinutes() +
          ':' +
          today.getSeconds() +
          ':' +
          today.getMilliseconds()
        commit('ADD_MESSAGE', { message: data, time })
      } catch (e) {
        console.info(e)
      }
    }
  },
}

export const getters = {
  accessToken: (state) => {
    return state.homee.token
  },
  connecting: (state) => {
    return state.homee.isConnecting
  },
  connected: (state) => {
    return state.homee.isConnected
  },
  reconnecting: (state) => {
    return state.homee.reconnecting
  },
  closeReason: (state) => {
    return state.closeReason
  },
  messages: (state) => {
    return state.messages
  },
  id: (state) => {
    return state.homee.id
  },
  savedLogins: (state) => {
    return state.savedLogins
  },
}
