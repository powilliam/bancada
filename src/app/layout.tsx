import type { Metadata, Viewport } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Bancada',
  description: 'Motores de carro e moto numa bancada 3D, com som sintetizado em tempo real.',
};

export const viewport: Viewport = {
  themeColor: '#0b0c0e',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
