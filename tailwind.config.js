module.exports = {
  darkMode: false,
  purge: ['./renderer/pages/**/*.tsx', './renderer/components/**/*.tsx'],
  theme: {
    cursor: {
      auto: 'auto',
      default: 'default',
      pointer: 'pointer',
      wait: 'wait',
      text: 'text',
      move: 'move',
      'not-allowed': 'not-allowed',
      "ew-resize": "ew-resize",
      "ns-resize": "ns-resize"
    }
  },
  variants: {
    extend: {
      textColor: ['disabled'],
      cursor: ['disabled'],
      borderWidth: ['last'],
      visibility: ['group-hover', 'last']
    },
  },
  plugins: [],
};
