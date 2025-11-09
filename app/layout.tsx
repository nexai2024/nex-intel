import './globals.css';
import { AppLayout } from '@/app/components/AppLayout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try{var t=localStorage.getItem('theme');if(t){document.documentElement.classList.toggle('dark', t==='dark')}}catch(e){}
        `}} />
      </head>
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}