/** Sistema visual «Hive Arena».
 *
 *  La marca se llama colmena, así que el hexágono es la forma de la casa
 *  (ver .bg-hive y .clip-hex en index.css) y el acento es voltaje: verde lima
 *  sobre tinta casi negra, con un naranja de urgencia para lo que está en
 *  vivo. Cada disciplina tiene además su propio color (volt, ice, plasma,
 *  flare, ember) para que el fútbol y el tejo no se vean igual.
 *
 *  Los nombres de token no cambian —secondary sigue siendo el acento de
 *  acción— para que el sistema entero se mueva retocando este archivo.
 */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tinta: casi negro con un tiro de azul, para que el acento queme.
        background: '#070910',
        surface: '#070910',
        'surface-dim': '#05060C',
        'surface-bright': '#2C3340',
        'surface-container-lowest': '#04050A',
        'surface-container-low': '#0C0F18',
        'surface-container': '#11151F',
        'surface-container-high': '#191E2A',
        'surface-container-highest': '#232936',
        'surface-variant': '#232936',
        'on-surface': '#EAF0FA',
        'on-surface-variant': '#99A4B8',
        'on-background': '#EAF0FA',
        outline: '#7A8396',
        'outline-variant': '#272E3D',
        // Acento neutro (info, cambios, roles).
        primary: '#A9B8FF',
        'on-primary': '#141C33',
        'primary-container': '#161F3A',
        'on-primary-container': '#BCC8FF',
        // Acento de acción: voltaje.
        secondary: '#C7FF3F',
        'on-secondary': '#0F1A00',
        'secondary-container': '#9BE000',
        'on-secondary-container': '#0D1400',
        // Urgencia: en vivo, aplazado, W.O.
        tertiary: '#FF6A3D',
        'on-tertiary': '#2B0C00',
        'tertiary-container': '#FF3D00',
        'on-tertiary-container': '#FFE0D4',
        error: '#FF7A72',
        'on-error': '#4A0603',
        'error-container': '#7A1208',
        'on-error-container': '#FFDAD4',
        // Paleta de disciplinas y de datos.
        volt: '#C7FF3F',
        ice: '#35E7FF',
        plasma: '#B15CFF',
        flare: '#FF6A3D',
        ember: '#FFB03A',
      },
      fontFamily: {
        // Archivo es variable y tiene eje de ancho: los titulares van
        // ensanchados, como una gráfica de transmisión deportiva.
        display: ['Archivo', 'Lexend', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.3rem',
        lg: '0.6rem',
        xl: '0.9rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        full: '9999px',
      },
      boxShadow: {
        volt: '0 0 0 1px rgba(199,255,63,.22), 0 16px 40px -18px rgba(199,255,63,.45)',
        'volt-sm': '0 8px 20px -10px rgba(199,255,63,.65)',
        flare: '0 16px 40px -18px rgba(255,106,61,.5)',
        lift: '0 24px 50px -28px rgba(0,0,0,.95)',
      },
      backgroundImage: {
        volt: 'linear-gradient(100deg,#E2FF8F 0%,#C7FF3F 45%,#9BE000 100%)',
        'volt-soft': 'linear-gradient(135deg,rgba(199,255,63,.18),rgba(53,231,255,.08) 55%,transparent)',
      },
      keyframes: {
        'live-pulse': {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.35', transform: 'scale(.78)' },
        },
        sheen: {
          '0%': { transform: 'translateX(-130%) skewX(-18deg)' },
          '100%': { transform: 'translateX(230%) skewX(-18deg)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'count-flip': {
          from: { opacity: '0', transform: 'translateY(-40%) scale(.9)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'live-pulse': 'live-pulse 1.6s ease-in-out infinite',
        sheen: 'sheen 1.1s ease-out',
        marquee: 'marquee 32s linear infinite',
        'rise-in': 'rise-in .4s cubic-bezier(.2,.8,.2,1) both',
        'count-flip': 'count-flip .32s cubic-bezier(.2,.8,.2,1)',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
}
