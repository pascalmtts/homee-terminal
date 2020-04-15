<template>
  <v-card>
    <v-card-title primary-title class="headline"
      >Websocket Verbindung</v-card-title
    >
    <v-card-text @keyup.enter="sendMessage()">
      <v-row v-if="connected" row>
        <v-col cols="12">
          <v-text-field
            v-model="wsmessage"
            label="Nachricht"
            append-outer-icon="mdi-send"
            clearable
            @click:append-outer="sendMessage()"
          ></v-text-field>
        </v-col>
      </v-row>
      <div id="messages" class="messages"></div>
    </v-card-text>
  </v-card>
</template>

<script>
import JSONFormatter from 'json-formatter-js'

export default {
  data() {
    return {
      wsmessage: '',
    }
  },
  computed: {
    messages() {
      return this.$store.getters.messages
    },
    connected() {
      return this.$store.getters.connected
    },
  },
  watch: {
    messages() {
      this.getMessages()
    },
  },
  mounted() {
    this.getMessages()
  },
  methods: {
    getMessages() {
      const messagesDiv = document.getElementById('messages')
      while (messagesDiv.firstChild) {
        messagesDiv.removeChild(messagesDiv.firstChild)
      }
      for (let i = this.messages.length - 1; i >= 0; i--) {
        const formatter = new JSONFormatter(this.messages[i].message, 4, {
          theme: 'dark',
        })
        const newDiv = document.createElement('div')
        newDiv.className = 'message'
        const newContent = document.createTextNode(
          this.messages[i].time + ' Frame ' + (i + 1)
        )
        newDiv.appendChild(newContent)
        newDiv.appendChild(formatter.render())
        messagesDiv.appendChild(newDiv)
      }
    },
    sendMessage() {
      this.$store.dispatch('sendMessage', this.wsmessage)
    },
  },
}
</script>

<style lang="scss">
.messages {
  padding-top: 15px;
  overflow: scroll;
  max-height: calc(100vh - 290px);
}
.message {
  margin-bottom: 20px;
}
</style>
