import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#3B82F6',
          secondary: '#64748B',
        },
      },
    },
  },
  defaults: {
    VCard: { elevation: 2 },
    VTextField: { variant: 'outlined', density: 'comfortable' },
  },
})
