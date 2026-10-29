import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function copyStaticAssets(): Plugin {
  return {
    name: 'copy-static-assets',
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname, 'dist');
      for (const directory of ['css', 'js']) {
        const src = path.resolve(import.meta.dirname, 'frontend', directory);
        const dest = path.resolve(distDir, directory);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true });
        }
      }
      const fav = path.resolve(import.meta.dirname, 'frontend/favicon.svg');
      if (fs.existsSync(fav)) {
        fs.copyFileSync(fav, path.resolve(distDir, 'favicon.svg'));
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [copyStaticAssets()],
    root: path.resolve(import.meta.dirname, 'frontend'),
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'frontend/index.html'),
          dashboard: path.resolve(import.meta.dirname, 'frontend/dashboard.html'),
          notes: path.resolve(import.meta.dirname, 'frontend/notes.html'),
          mindmap: path.resolve(import.meta.dirname, 'frontend/mindmap.html'),
          flashcards: path.resolve(import.meta.dirname, 'frontend/flashcards.html'),
          quiz: path.resolve(import.meta.dirname, 'frontend/quiz.html'),
          library: path.resolve(import.meta.dirname, 'frontend/library.html'),
          profile: path.resolve(import.meta.dirname, 'frontend/profile.html'),
          login: path.resolve(import.meta.dirname, 'frontend/login.html'),
          signup: path.resolve(import.meta.dirname, 'frontend/signup.html'),
          privacy: path.resolve(import.meta.dirname, 'frontend/privacy.html'),
          terms: path.resolve(import.meta.dirname, 'frontend/terms.html'),
          cookies: path.resolve(import.meta.dirname, 'frontend/cookies.html'),
          accessibility: path.resolve(import.meta.dirname, 'frontend/accessibility.html'),
          disclaimer: path.resolve(import.meta.dirname, 'frontend/disclaimer.html'),
          help: path.resolve(import.meta.dirname, 'frontend/help.html'),
          notfound: path.resolve(import.meta.dirname, 'frontend/404.html'),
          servererror: path.resolve(import.meta.dirname, 'frontend/500.html'),
        },
      },
    },
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:5000',
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
