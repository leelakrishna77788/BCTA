import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/admin')) {
            console.log(`[Vite API Proxy] ${req.method} ${req.url}`);
            
            process.env.FIREBASE_SERVICE_ACCOUNT = env.FIREBASE_SERVICE_ACCOUNT;
            try {
              const { default: handler } = await server.ssrLoadModule('./api/admin.ts');
              
              const originalSetHeader = res.setHeader.bind(res);
              const vercelRes = Object.assign(res, {
                status: (code: number) => { res.statusCode = code; return vercelRes; },
                json: (data: any) => {
                  originalSetHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return vercelRes;
                },
                setHeader: (name: string, value: string | string[]) => {
                  originalSetHeader(name, value);
                  return vercelRes;
                }
              });

              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    (req as any).body = JSON.parse(body || '{}');
                    await handler(req as any, vercelRes as any);
                  } catch (e) {
                    vercelRes.status(400).json({ error: 'Invalid JSON' });
                  }
                });
              } else {
                await handler(req as any, vercelRes as any);
              }
              return;
            } catch (err: any) {
              console.error('API Error:', err);
              res.statusCode = 500;
              res.end(err?.message || 'Internal server error');
              return;
            }
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ui': ['lucide-react', 'recharts', 'react-hot-toast'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore']
  }
  };
})
