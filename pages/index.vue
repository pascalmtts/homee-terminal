<template>
  <v-container grid-list-md container--fluid>
    <v-row v-if="connected">
      <v-col cols="12" md="6">
        <WebsocketMessages />
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title primary-title class="headline">Aktionen</v-card-title>
          <v-list subheader>
            <v-list-item @click="deleteMessages()">
              <v-list-item-icon>
                <v-icon>mdi-delete-sweep</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Verlauf löschen</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item @click="$store.dispatch('disconnect')">
              <v-list-item-icon>
                <v-icon>mdi-logout</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Verbindung trennen</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-else>
      <v-col cols="12" md="6">
        <v-card @keyup.enter="authenticate()">
          <v-card-title>
            <span class="headline">homee Terminal</span>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="5" md="6">
                <v-form ref="connectForm">
                  <v-text-field
                    v-model="connectData.id"
                    label="homee ID"
                    required
                    clearable
                  ></v-text-field>
                  <v-text-field
                    v-model="connectData.username"
                    label="Benutzername"
                    type="text"
                    required
                    clearable
                  ></v-text-field>
                  <v-text-field
                    v-model="connectData.password"
                    label="Passwort"
                    type="password"
                    required
                    clearable
                  ></v-text-field>
                </v-form>
              </v-col>
              <v-col cols="12" sm="7" md="6">
                <v-list subheader>
                  <v-subheader>Zuletzt verbunden</v-subheader>
                  <div v-if="savedLogins.length > 0">
                    <v-list-item
                      v-for="savedLogin in savedLogins"
                      :key="savedLogin.id"
                      two-line
                      @click="authenticate(savedLogin.id)"
                    >
                      <v-list-item-avatar>
                        <v-icon>mdi-cube</v-icon>
                      </v-list-item-avatar>
                      <v-list-item-content>
                        <v-list-item-title>{{
                          savedLogin.id
                        }}</v-list-item-title>
                        <v-list-item-subtitle>{{
                          savedLogin.note
                        }}</v-list-item-subtitle>
                      </v-list-item-content>
                      <v-list-item-action>
                        <v-btn
                          icon
                          @click.stop="
                            $store.commit('REMOVE_SAVED_LOGIN', savedLogin.id)
                          "
                        >
                          <v-icon color="grey lighten-1">mdi-close</v-icon>
                        </v-btn>
                      </v-list-item-action>
                    </v-list-item>
                  </div>
                  <div v-else>
                    <v-list-item>
                      <v-list-item-content>
                        <v-list-item-title
                          >Keine gespeicherten Verbindungen</v-list-item-title
                        >
                      </v-list-item-content>
                    </v-list-item>
                  </div>
                </v-list>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-btn
              :loading="connecting"
              color="blue darken-1"
              text
              @click="authenticate()"
            >
              Verbinden
              <template v-slot:loader>
                <v-progress-circular
                  :size="25"
                  indeterminate
                  color="primary"
                ></v-progress-circular>
              </template>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex'
import heartbeat from '~/mixins/heartbeat.js'
import WebsocketMessages from '~/components/WebsocketMessages.vue'

export default {
  components: {
    WebsocketMessages
  },
  mixins: [heartbeat],
  data() {
    return {
      connectData: {
        supportData: undefined,
        id: undefined,
        username: undefined,
        password: undefined,
        note: ''
      }
    }
  },
  computed: {
    ...mapGetters([
      'connected',
      'connecting',
      'reconnecting',
      'closeReason',
      'savedLogins'
    ])
  },
  watch: {
    connected() {
      if (this.connected) {
        this.startHeartbeat()
        this.$store.commit('SET_CONNECTING', false)
        this.fab = false
        this.$toast('Verbindung hergestellt', {
          color: 'success'
        })
        try {
          if (this.$refs.connectForm) {
            this.$refs.connectForm.reset()
          }
        } catch (e) {
          console.info(e)
        }
      } else {
        this.stopHeartbeat()
        switch (this.closeReason) {
          case 'CLEAN':
            this.$toast('Verbindung getrennt', {
              color: 'error'
            })
            break
          case 'TOKEN_INVALID':
            this.$toast(
              'Der Token ist nicht mehr gültig. Bitte verbinde dich erneut',
              {
                color: 'error'
              }
            )
            break
          case 'SERVICE_RESTART':
            this.$toast('homee wird neugestartet', {
              color: 'warning'
            })
            break
          default:
            this.$toast('Verbindung verloren.', {
              color: 'error'
            })
            break
        }
      }
    },
    reconnecting() {
      if (this.reconnecting) {
        this.$toast('Verbindung wird wiederhergestellt', {
          color: 'warning'
        })
      }
    },
    savedLogins(value) {
      localStorage.setItem('savedLogins', JSON.stringify(value))
    }
  },
  beforeCreate() {
    this.$store.commit('INITIALIZE_SAVED_LOGINS')
  },
  mounted() {
    this.$wsInitialize()
    this.theme()
  },
  methods: {
    deleteMessages() {
      this.$store.commit('DELETE_MESSAGES')
    },
    theme() {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        this.$vuetify.theme.dark = false
      } else {
        this.$vuetify.theme.dark = true
      }
    },
    authenticate(id) {
      let connectData
      if (id) {
        connectData = { id }
      } else {
        connectData = this.connectData
      }
      this.$store.dispatch('authenticate', connectData)
    }
  }
}
</script>
