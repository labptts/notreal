# The Talent Core

An interactive 3D portfolio showcasing AI creators in an immersive, rotating sphere interface built with Three.js and GSAP.

## Features

- **Interactive 3D Sphere**: 20 panels arranged in a Fibonacci sphere distribution
- **Smooth Rotation**: Custom rotation controls with inertia and damping
- **Panel Selection**: Click on any panel to zoom in and focus
- **Video Textures**: Each panel can display video content
- **Responsive Design**: Works on desktop and mobile devices
- **Cosmic Background**: Animated starfield for depth and atmosphere

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment on platforms like Render.

## Adding Video Content

To add video content to the panels:

1. Place your video file as `preview.mp4` in the `/public` directory
2. The video should be in MP4 format, ideally in vertical orientation (e.g., 1080x1920)
3. The application will automatically use the video for all panels

## Controls

- **Mouse Drag**: Rotate the sphere
- **Touch Drag**: Rotate on mobile devices
- **Click/Tap on Panel**: Select and zoom to a specific creator panel

## Technology Stack

- **Vite**: Fast build tool and development server
- **Three.js**: 3D graphics library
- **GSAP**: Animation library for smooth transitions
- **Vanilla JavaScript**: No framework dependencies

## Deployment

This project is ready to be deployed as a static site on platforms like:
- Render
- Netlify
- Vercel
- GitHub Pages

Simply upload the contents of the `dist/` folder after building.
