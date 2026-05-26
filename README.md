<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# IAmobil Gestor - Gestão de Imóveis com IA

Sistema de gestão de imóveis para corretores parceiros, com integração de IA.

View your app in AI Studio: https://ai.studio/apps/e832ef97-fde5-42b6-b96c-07f59ca24453

## 🚀 Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your `GEMINI_API_KEY`

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173

## 📦 Deploy to Koyeb

Este projeto está configurado para deploy contínuo no Koyeb. Veja o guia [DEPLOY_KOYEB.md](DEPLOY_KOYEB.md) para detalhes.

## 🔧 Environment Variables

Required variables:
- `GEMINI_API_KEY` - Your Google Gemini API key
- `VITE_API_URL` - Backend API URL (optional, if you have a separate backend)

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run TypeScript type checking

## 🏗️ Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Google Gemini AI

## 📄 License

Apache-2.0
