"""
Build script: Compiles Jinja2 templates to static HTML for Firebase Hosting.
Run this before deploying:  python build.py
Output goes to ./public/ directory.
"""
import os
import shutil
from app import app

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), 'public')
STATIC_SRC = os.path.join(os.path.dirname(__file__), 'static')
STATIC_DST = os.path.join(PUBLIC_DIR, 'static')
ICONS_SRC = os.path.join(STATIC_SRC, 'icons')
ICONS_DST = os.path.join(STATIC_DST, 'icons')

# Routes to build (route path → output filename)
ROUTES = {
    '/': 'index.html',
    '/mental-health': 'mental-health.html',
    '/physical-health': 'physical-health.html',
    '/nutrition': 'nutrition.html',
    '/study-life': 'study-life.html',
    '/sleep': 'sleep.html',
    '/gratitude': 'gratitude.html',
    '/auth': 'auth.html',
}


def build():
    """Render all Jinja2 templates to static HTML files."""
    print('🔨 Building static site for Firebase deployment...')

    # Clean and recreate public directory
    if os.path.exists(PUBLIC_DIR):
        shutil.rmtree(PUBLIC_DIR)
    os.makedirs(PUBLIC_DIR, exist_ok=True)

    # Copy static files
    if os.path.exists(STATIC_DST):
        shutil.rmtree(STATIC_DST)
    shutil.copytree(STATIC_SRC, STATIC_DST)

    # Copy service worker to root (PWA requirement)
    sw_src = os.path.join(STATIC_SRC, 'sw.js')
    sw_dst = os.path.join(PUBLIC_DIR, 'sw.js')
    shutil.copy2(sw_src, sw_dst)
    print('  ✓ Copied static/ → public/static/')
    print('  ✓ Copied sw.js to public/ root')

    # Render each route
    with app.test_client() as client:
        for route, filename in ROUTES.items():
            response = client.get(route)
            filepath = os.path.join(PUBLIC_DIR, filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(response.data.decode('utf-8'))
            print(f'  ✓ {route} → {filename}')

    print(f'\n✅ Build complete! Output: {PUBLIC_DIR}/')
    print('   Deploy with: firebase deploy --only hosting')


if __name__ == '__main__':
    build()
