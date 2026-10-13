import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'index.html'),
          dashboard: path.resolve(import.meta.dirname, 'dashboard.html'),
          notes: path.resolve(import.meta.dirname, 'notes.html'),
          mindmap: path.resolve(import.meta.dirname, 'mindmap.html'),
          flashcards: path.resolve(import.meta.dirname, 'flashcards.html'),
          quiz: path.resolve(import.meta.dirname, 'quiz.html'),
          library: path.resolve(import.meta.dirname, 'library.html'),
          profile: path.resolve(import.meta.dirname, 'profile.html'),
          login: path.resolve(import.meta.dirname, 'login.html'),
          signup: path.resolve(import.meta.dirname, 'signup.html'),
          privacy: path.resolve(import.meta.dirname, 'privacy.html'),
          terms: path.resolve(import.meta.dirname, 'terms.html'),
          cookies: path.resolve(import.meta.dirname, 'cookies.html'),
          accessibility: path.resolve(import.meta.dirname, 'accessibility.html'),
          disclaimer: path.resolve(import.meta.dirname, 'disclaimer.html'),
          help: path.resolve(import.meta.dirname, 'help.html'),
          notfound: path.resolve(import.meta.dirname, '404.html'),
          servererror: path.resolve(import.meta.dirname, '500.html'),
        },
      },
    },
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:5000',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
