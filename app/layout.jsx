import './globals.css';
import { I18nProvider } from './i18n-provider';

export const metadata = {
  title: 'Облік чеків / Receipt Tracker',
  description: 'Фото чека → розпізнавання → база → вивантаження для бухгалтера',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="uk">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
