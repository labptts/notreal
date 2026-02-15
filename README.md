# Talent Core - Interactive 3D Portfolio

An interactive 3D portfolio website for an AI creators agency, built with Three.js and GSAP.

## Features

- **3D Core Structure**: 20 creator panels arranged in a spherical formation using the Fibonacci sphere algorithm
- **Interactive Rotation**: Drag to rotate the core with smooth inertia effect
- **Panel Selection**: Click on any panel to focus and scale it up
- **Responsive Design**: Works on desktop and mobile devices
- **Cosmic Background**: Animated starfield for depth
- **Colorful Panels**: Each creator has a unique gradient color scheme

## Tech Stack

- **Vite**: Fast build tool and dev server
- **Three.js**: 3D graphics library
- **GSAP**: Animation library for smooth transitions
- **Vanilla JavaScript**: No framework dependencies

## Development

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment

This project is configured to deploy as a Static Site on Render or any static hosting service.

### Deploy to Render

1. Connect your GitHub repository to Render
2. Create a new Static Site
3. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Deploy!

### Deploy to Other Services

The `dist` folder contains all static files needed for deployment. You can deploy to:
- Netlify
- Vercel
- GitHub Pages
- Any static file hosting

## Customization

### Adding Video Content

Replace `/public/preview.mp4` with your own video file (recommended: 720x1280, vertical format, looped).

### Changing Colors

Edit the `colors` array in `src/main.js` to customize panel gradients.

### Adjusting Panel Count

Change the number in `fibonacciSphere(20)` to add more or fewer panels.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with WebGL support

## License

MIT
