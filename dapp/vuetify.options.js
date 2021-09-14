import colors from 'vuetify/es5/util/colors'

export default {
  theme: {
    dark: false,
    themes: {
      light: {
        primary: '#11557b',
        secondary: '#81d4fa',
        tertiary: '#212121',
        accent: '#448AFF',
        error: '#B83737',
        warning: '#f76400',
        info: '#376BBB',
        success: '#33993D',
        white: '#FFFFFF',
      },
      dark: {
        primary: '#00579C',
        accent: '#979797',
        secondary: '#D89B4B',
        info: '#2D60FF',
        warning: '#FFBB38',
        error: colors.deepOrange.accent4,
        success: colors.green.accent3,
        rose: '#F67E9C',
        grass: colors.teal.lighten1,
        primarylite: '#8BA3CA',
        gray: '#333333',
        graylite: '#E0E0E0',
        dark: '#121212',
      },
    },
  },
}
