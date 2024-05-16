/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {

      colors: {
        // Existing Base colors and their variants
        mint: '#0EEDC5',
        forest: '#1AF589',
        sky: '#2D2530',
        ocean: '#386FFD',
        lemon: '#61FF71',
        sunset: '#FBE202',
        purple: '#8A2BE2',
        red: '#FF6347',

        // Existing Light variants
        'mint-light': '#33f7df',
        'forest-light': '#3bfb9f',
        'sky-light': '#534e5a',
        'ocean-light': '#5a7ffd',
        'lemon-light': '#74ff8a',
        'sunset-light': '#fdff52',
        'red-light': '#FF847c',  // A lighter, more pastel red
        'purple-light': '#9B72DA', // A lighter, softer purple

        // Existing Dark variants
        'mint-dark': '#0cbfa2',
        'forest-dark': '#168c66',
        'sky-dark': '#1c1a24',
        'ocean-dark': '#2c4ccd',
        'lemon-dark': '#4ecc58',
        'sunset-dark': '#c8cc02',
        'red-dark': '#E55039',   // A darker, richer red
        'purple-dark': '#7B1FA2', // A darker, more intense purple  
      },
      
    },
  },
  plugins: [],
}

