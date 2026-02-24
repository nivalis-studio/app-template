import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

export const fontInter = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const geistSans = localFont({
  src: './GeistVF.woff',
  variable: '--font-geist-sans',
});

const geistMono = localFont({
  src: './GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const fonts = `${fontInter.variable} ${geistSans.variable} ${geistMono.variable}`;
